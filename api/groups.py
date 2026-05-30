import secrets

from fastapi import APIRouter, HTTPException

from core.database import supabase
from models.schemas import GroupCreate, PostCreate, ProfileUpdate
from services import post_logic

router = APIRouter()


@router.post("/create")
async def create_group(item: GroupCreate):
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
async def join_group(user_id: str, invite_code: str):
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
async def get_user_groups(user_id: str):
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
async def update_profile(item: ProfileUpdate):
    # profiles 테이블에 닉네임 저장 (없으면 생성, 있으면 수정)
    # Supabase의 upsert 기능을 활용합니다.
    res = supabase.table("profiles").upsert({
        "id": item.user_id,
        "nickname": item.nickname
    }).execute()
    return {"status": "success", "nickname": item.nickname}


@router.post("/{group_id}/posts")
async def add_hedge_post(group_id: str, item: PostCreate):
    try:
        post = post_logic.create_group_post(
            user_id=item.user_id,
            group_id=group_id,
            ticker_symbol=item.ticker_symbol,
            target_price=item.target_price,
            prediction_type=item.prediction_type,
            target_date=item.target_date
        )
        return {"status": "success", "message": "박제 성공!", "data": post}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{group_id}/posts")
async def list_group_posts(group_id: str):
    try:
        posts = post_logic.get_group_posts(group_id)
        return {"status": "success", "data": posts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{group_id}/posts/{post_id}")
async def post_detail(group_id: str, post_id: str):
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
async def get_group_ranking(group_id: str):
    # 1. 그룹 멤버 목록과 그들의 닉네임 가져오기 (1차 쿼리)
    # profiles 테이블과 group_members를 연결해서 가져옵니다.
    members_res = supabase.table("group_members") \
        .select("user_id, profiles(nickname)") \
        .eq("group_id", group_id) \
        .execute()
    
    if not members_res.data:
        return {"group_id": group_id, "ranking": []}
        
    user_ids = [m['user_id'] for m in members_res.data]
    
    # 2. 모든 멤버들의 포트폴리오 정보를 한 번에 가져오기 (2차 쿼리)
    # stocks 테이블의 current_price도 함께 JOIN하여 가져옵니다.
    port_res = supabase.table("portfolios") \
        .select("*, stocks(current_price)") \
        .in_("user_id", user_ids) \
        .execute()
        
    # user_id 별로 포트폴리오 데이터를 그룹화 (메모리 상에서 매핑)
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
            # stocks 정보가 없거나 current_price가 없는 경우를 대비한 방어 로직
            current_price = stocks_info.get('current_price') if (stocks_info and stocks_info.get('current_price') is not None) else 0
            
            total_buy += (p['avg_price'] * p['quantity'])
            total_val += (current_price * p['quantity'])
        
        yield_pct = ((total_val - total_buy) / total_buy * 100) if total_buy > 0 else 0
        
        ranking_data.append({
            "nickname": nickname,
            "yield": round(yield_pct, 2),
            "total_value": int(total_val)
        })

    # 3. 수익률 순으로 정렬 (내림차순)
    ranking_data.sort(key=lambda x: x['yield'], reverse=True)

    return {
        "group_id": group_id,
        "ranking": ranking_data
    }