import secrets

from fastapi import APIRouter, HTTPException, Depends

from core.database import supabase
from core.security import get_current_user
from models.schemas import GroupCreate, PostCreate, ProfileUpdate
from services import post_logic

router = APIRouter()


@router.post("/create")
async def create_group(item: GroupCreate, current_user = Depends(get_current_user)):
    # 보안 검증(IDOR 가드): 본인 명의로만 그룹 생성 가능
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="자신이 아닌 유저의 명의로 그룹을 생성할 권한이 없습니다."
        )

    invite_code = secrets.token_hex(3).upper()

    group_res = supabase.table("groups").insert(
        {"name": item.group_name, "invite_code": invite_code}
    ).execute()

    group_id = group_res.data[0]["id"]

    supabase.table("group_members").insert(
        {
            "group_id": group_id,
            "user_id": item.user_id,
            "is_amount_visible": True,
        }
    ).execute()

    return {"status": "success", "group_id": group_id, "invite_code": invite_code}


@router.post("/join")
async def join_group(user_id: str, invite_code: str, current_user = Depends(get_current_user)):
    # 보안 검증(IDOR 가드): 본인 명의로만 그룹 가입 가능
    if user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="자신이 아닌 유저를 그룹에 참여시킬 권한이 없습니다."
        )

    group_res = (
        supabase.table("groups").select("id").eq("invite_code", invite_code).execute()
    )
    if not group_res.data:
        raise HTTPException(status_code=404, detail="잘못된 초대 코드입니다.")

    group_id = group_res.data[0]["id"]

    try:
        supabase.table("group_members").insert(
            {"group_id": group_id, "user_id": user_id}
        ).execute()
        return {"status": "success", "message": "그룹에 참여했습니다."}
    except Exception:
        return {"status": "error", "message": "이미 참여 중인 그룹입니다."}


@router.get("/user/{user_id}")
async def get_user_groups(user_id: str, current_user = Depends(get_current_user)):
    # 보안 검증(IDOR 가드): 본인의 소속 그룹 목록만 조회 가능
    if user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="다른 사용자의 가입 그룹 목록을 조회할 권한이 없습니다."
        )

    try:
        # group_members와 groups 테이블을 JOIN하여 해당 유저가 가입한 그룹 정보들을 한꺼번에 가져옵니다.
        res = supabase.table("group_members") \
            .select("group_id, groups(id, name, invite_code)") \
            .eq("user_id", user_id) \
            .execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile/update")
async def update_profile(item: ProfileUpdate, current_user = Depends(get_current_user)):
    # 보안 검증(IDOR 가드): 자신의 닉네임만 수정 가능
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="자신이 아닌 다른 유저의 프로필을 수정할 권한이 없습니다."
        )

    res = supabase.table("profiles").upsert({
        "id": item.user_id,
        "nickname": item.nickname
    }).execute()
    return {"status": "success", "nickname": item.nickname}


@router.post("/{group_id}/posts")
async def add_hedge_post(group_id: str, item: PostCreate, current_user = Depends(get_current_user)):
    # 보안 검증(IDOR 가드): 본인 명의로만 예측글 박제 가능
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="타인의 명의로 예측 글을 등록할 권한이 없습니다."
        )

    # 비정상 데이터 방어 (음수 및 0 차단)
    if item.target_price <= 0:
        raise HTTPException(
            status_code=400,
            detail="목표 가격은 0보다 큰 양수여야 합니다."
        )

    try:
        post = post_logic.create_group_post(
            user_id=item.user_id,
            group_id=group_id,
            ticker_symbol=item.ticker_symbol,
            target_price=item.target_price,
            prediction_type=item.prediction_type,
            target_date=item.target_date,
            description=item.description
        )
        return {"status": "success", "message": "박제 성공!", "data": post}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{group_id}/posts")
async def list_group_posts(group_id: str, current_user = Depends(get_current_user)):
    # 보안 검증: 현재 로그인한 사용자가 해당 그룹의 회원이어야만 게시글 조회가 가능함
    if not post_logic.check_group_membership(current_user.id, group_id):
        raise HTTPException(
            status_code=403,
            detail="해당 그룹에 가입된 회원만 예측 타임라인을 조회할 수 있습니다."
        )

    try:
        posts = post_logic.get_group_posts(group_id)
        return {"status": "success", "data": posts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{group_id}/posts/{post_id}")
async def post_detail(group_id: str, post_id: str, current_user = Depends(get_current_user)):
    # 보안 검증: 현재 로그인한 사용자가 해당 그룹의 회원이어야만 게시글 상세조회가 가능함
    if not post_logic.check_group_membership(current_user.id, group_id):
        raise HTTPException(
            status_code=403,
            detail="접근 권한이 없습니다."
        )

    try:
        post = post_logic.get_post_detail(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
        if str(post["group_id"]) != group_id:
             raise HTTPException(status_code=403, detail="다른 그룹의 게시글입니다.")
        return {"status": "success", "data": post}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{group_id}/ranking")
async def get_group_ranking(group_id: str, current_user = Depends(get_current_user)):
    # 보안 검증: 현재 로그인한 사용자가 해당 그룹의 회원이어야만 랭킹 경쟁판 조회가 가능함
    if not post_logic.check_group_membership(current_user.id, group_id):
        raise HTTPException(
            status_code=403,
            detail="해당 그룹에 가입된 회원만 실시간 리그 랭킹을 조회할 수 있습니다."
        )

    # 1. 그룹 멤버 목록과 그들의 닉네임 가져오기 (1차 쿼리)
    members_res = supabase.table("group_members") \
        .select("user_id, profiles(nickname)") \
        .eq("group_id", group_id) \
        .execute()
    
    if not members_res.data:
        return {"group_id": group_id, "ranking": []}
        
    user_ids = [m['user_id'] for m in members_res.data]
    
    # 2. 모든 멤버들의 포트폴리오 정보를 한 번에 가져오기 (2차 쿼리)
    port_res = supabase.table("portfolios") \
        .select("*, stocks(current_price)") \
        .in_("user_id", user_ids) \
        .execute()
        
    user_portfolios = {}
    for p in port_res.data:
        uid = p['user_id']
        if uid not in user_portfolios:
            user_portfolios[uid] = []
        user_portfolios[uid].append(p)
        
    ranking_data = []

    for member in members_res.data:
        uid = member['user_id']
        nickname = member['profiles']['nickname'] if member['profiles'] else "무명개미"
        port_list = user_portfolios.get(uid, [])

        total_buy = 0
        total_val = 0
        
        for p in port_list:
            stocks_info = p.get('stocks')
            current_price = stocks_info.get('current_price') if (stocks_info and stocks_info.get('current_price') is not None) else 0
            
            total_buy += (p['avg_price'] * p['quantity'])
            total_val += (current_price * p['quantity'])
        
        yield_pct = ((total_val - total_buy) / total_buy * 100) if total_buy > 0 else 0
        
        ranking_data.append({
            "user_id": uid,
            "nickname": nickname,
            "yield": round(yield_pct, 2),
            "total_value": int(total_val)
        })

    ranking_data.sort(key=lambda x: x['yield'], reverse=True)

    return {
        "group_id": group_id,
        "ranking": ranking_data
    }