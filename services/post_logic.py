from datetime import date
from core.database import supabase
from services.stock_logic import fetch_current_price

def check_group_membership(user_id: str, group_id: str) -> bool:
    """사용자가 해당 그룹의 멤버인지 확인합니다."""
    res = supabase.table("group_members") \
        .select("*") \
        .eq("group_id", group_id) \
        .eq("user_id", user_id) \
        .execute()
    return len(res.data) > 0

def create_group_post(user_id: str, group_id: str, ticker_symbol: str, target_price: int, prediction_type: str, target_date: str):
    """예측글(박제)을 등록합니다 (방향 및 기한 추가)."""
    # 1. 멤버십 체크
    if not check_group_membership(user_id, group_id):
        raise ValueError("해당 그룹의 멤버가 아닙니다.")
    
    # 2. 현재 시세 가져오기 (entry_price)
    entry_price = fetch_current_price(ticker_symbol)
    
    # 3. 게시글 저장
    post_data = {
        "group_id": group_id,
        "user_id": user_id,
        "ticker_symbol": ticker_symbol,
        "target_price": target_price,
        "entry_price": entry_price,
        "prediction_type": prediction_type.upper(), # RISE or FALL
        "target_date": target_date,
        "status": "pending"
    }
    
    res = supabase.table("group_posts").insert(post_data).execute()
    return res.data[0]

def get_group_posts(group_id: str):
    """그룹 내 게시글 목록을 조회합니다 (성공한 글 우선, 최신순)."""
    # profiles 조인하여 닉네임 함께 가져오기
    res = supabase.table("group_posts") \
        .select("*, profiles(nickname)") \
        .eq("group_id", group_id) \
        .order("status", descending=True) \
        .order("created_at", descending=True) \
        .execute()
    return res.data

def get_post_detail(post_id: str):
    """특정 게시글 상세 정보를 가져옵니다."""
    res = supabase.table("group_posts") \
        .select("*, profiles(nickname), groups(name)") \
        .eq("id", post_id) \
        .execute()
    return res.data[0] if res.data else None

def check_and_update_posts_status(ticker_symbol: str, current_price: int):
    """특정 종목의 pending 상태 게시글들을 체크하여 성공/실패 여부를 업데이트합니다."""
    today = date.today().isoformat()
    
    # pending 상태이면서 해당 종목인 글들 가져오기
    res = supabase.table("group_posts") \
        .select("id, target_price, prediction_type, target_date") \
        .eq("ticker_symbol", ticker_symbol) \
        .eq("status", "pending") \
        .execute()
    
    for post in res.data:
        p_id = post['id']
        t_price = post['target_price']
        p_type = post['prediction_type']
        t_date = post['target_date']
        
        is_success = False
        
        # 1. 성공 조건 체크
        if p_type == "RISE":
            if current_price >= t_price:
                is_success = True
        elif p_type == "FALL":
            if current_price <= t_price:
                is_success = True
        
        if is_success:
            supabase.table("group_posts").update({"status": "success"}).eq("id", p_id).execute()
            print(f"🎯 [Post Logic] Post {p_id} SUCCESS: {p_type} to {t_price} (Current: {current_price})")
        # 2. 실패 조건 체크 (기한 만료)
        elif t_date < today:
            supabase.table("group_posts").update({"status": "failed"}).eq("id", p_id).execute()
            print(f"💀 [Post Logic] Post {p_id} FAILED: Target date {t_date} passed.")
