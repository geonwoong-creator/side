import secrets

from fastapi import APIRouter, HTTPException

from core.database import supabase
from models.schemas import GroupCreate
from models.schemas import ProfileUpdate
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



@router.post("/profile/update")
async def update_profile(item: ProfileUpdate):
    # profiles 테이블에 닉네임 저장 (없으면 생성, 있으면 수정)
    # Supabase의 upsert 기능을 활용합니다.
    res = supabase.table("profiles").upsert({
        "id": item.user_id,
        "nickname": item.nickname
    }).execute()
    return {"status": "success", "nickname": item.nickname}


@router.get("/{group_id}/ranking")
async def get_group_ranking(group_id: str):
    # 1. 그룹 멤버 목록과 그들의 닉네임 가져오기 (JOIN)
    # profiles 테이블과 group_members를 연결해서 가져옵니다.
    members_res = supabase.table("group_members") \
        .select("user_id, profiles(nickname)") \
        .eq("group_id", group_id) \
        .execute()
    
    ranking_data = []

    for member in members_res.data:
        uid = member['user_id']
        nickname = member['profiles']['nickname'] if member['profiles'] else "무명개미"

        # 2. 각 멤버의 포트폴리오 수익률 계산
        # (이전에 만든 수익률 계산 로직 활용)
        port_res = supabase.table("portfolios") \
            .select("*, stocks(current_price)") \
            .eq("user_id", uid) \
            .execute()
        
        total_buy = 0
        total_val = 0
        for p in port_res.data:
            total_buy += (p['avg_price'] * p['quantity'])
            total_val += (p['stocks']['current_price'] * p['quantity'])
        
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