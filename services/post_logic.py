from datetime import date
from typing import Optional
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

def create_group_post(user_id: str, group_id: str, ticker_symbol: str, target_price: int, prediction_type: str, target_date: str, description: Optional[str] = None):
    """예측글(박제)을 등록합니다 (방향 및 기한 추가)."""
    # 1. 멤버십 체크
    if not check_group_membership(user_id, group_id):
        raise ValueError("해당 그룹의 멤버가 아닙니다.")

    # 2. 날짜 검증 (오늘보다 이전인 과거 날짜로의 얌체 예측 등록 차단)
    today_str = date.today().isoformat()
    if target_date < today_str:
        raise ValueError("목표 만료일은 오늘 또는 미래 날짜여야 합니다.")
    
    # 3. 현재 시세 가져오기 (entry_price)
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
        "status": "pending",
        "description": description
    }
    
    res = supabase.table("group_posts").insert(post_data).execute()
    return res.data[0]

def get_group_posts(group_id: str):
    """그룹 내 게시글 목록을 조회합니다 (성공한 글 우선, 최신순)."""
    # 0. 실시간 기한 만료 자동 판정 (스케줄러 미작동 주말/비개장 시간 대비)
    today_str = date.today().isoformat()
    try:
        supabase.table("group_posts") \
            .update({"status": "failed"}) \
            .eq("group_id", group_id) \
            .eq("status", "pending") \
            .lt("target_date", today_str) \
            .execute()
    except Exception as e:
        print(f"⚠️ [Post Logic] 실시간 기한 만료 판정 실패: {e}")

    # profiles 조인하여 닉네임 함께 가져오기
    res = supabase.table("group_posts") \
        .select("*, profiles(nickname)") \
        .eq("group_id", group_id) \
        .order("status", desc=True) \
        .order("created_at", desc=True) \
        .execute()
    
    posts = res.data
    if not posts:
        return []
        
    # 고유한 ticker_symbol 목록 수집
    tickers = list(set(p['ticker_symbol'] for p in posts if p.get('ticker_symbol')))
    if not tickers:
        return posts
        
    try:
        # stocks 테이블에서 종목명 일괄 조회 (N+1 문제 방지 및 2-Query 최적화)
        stocks_res = supabase.table("stocks") \
            .select("ticker_symbol, name") \
            .in_("ticker_symbol", tickers) \
            .execute()
            
        ticker_to_name = {s['ticker_symbol']: s['name'] for s in stocks_res.data}
        
        # 각 포스트에 stock_name 필드 주입
        for p in posts:
            p['stock_name'] = ticker_to_name.get(p['ticker_symbol'], p['ticker_symbol'])
    except Exception as e:
        print(f"⚠️ [Post Logic] 종목명 조인 실패: {e}")
        # 오류 발생 시 기본값으로 처리하여 페이지 크래시를 방지
        for p in posts:
            p['stock_name'] = p['ticker_symbol']
            
    return posts

def get_post_detail(post_id: str):
    """특정 게시글 상세 정보를 가져옵니다."""
    # 0. 실시간 기한 만료 자동 판정 (스케줄러 미작동 주말/비개장 시간 대비)
    today_str = date.today().isoformat()
    try:
        supabase.table("group_posts") \
            .update({"status": "failed"}) \
            .eq("id", post_id) \
            .eq("status", "pending") \
            .lt("target_date", today_str) \
            .execute()
    except Exception:
        pass

    res = supabase.table("group_posts") \
        .select("*, profiles(nickname), groups(name)") \
        .eq("id", post_id) \
        .execute()
    
    if not res.data:
        return None
        
    post = res.data[0]
    ticker = post.get('ticker_symbol')
    if ticker:
        try:
            stock_res = supabase.table("stocks").select("name").eq("ticker_symbol", ticker).execute()
            if stock_res.data:
                post['stock_name'] = stock_res.data[0]['name']
            else:
                post['stock_name'] = ticker
        except Exception:
            post['stock_name'] = ticker
    return post

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
