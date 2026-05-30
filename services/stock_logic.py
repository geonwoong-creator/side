from typing import Optional

import FinanceDataReader as fdr

from core.database import supabase


def fetch_current_price(ticker_symbol: str) -> int:
    df = fdr.DataReader(ticker_symbol)
    if df.empty:
        raise ValueError("존재하지 않는 종목코드입니다.")
    return int(df["Close"].iloc[-1])


def sync_stock_current_price(ticker_symbol: str, current_price: int) -> None:
    # stocks 테이블에 이미 종목이 존재하는지 먼저 확인 (FK 에러 방지)
    stock_exists = supabase.table("stocks").select("ticker_symbol").eq("ticker_symbol", ticker_symbol).execute()
    
    if not stock_exists.data:
        # 존재하지 않는 신규 종목이라면, 임의의 이름과 함께 삽입하여 FK 제약 에러를 방지합니다.
        supabase.table("stocks").insert({
            "ticker_symbol": ticker_symbol,
            "name": f"신규종목({ticker_symbol})",
            "current_price": current_price,
            "last_updated": "now()"
        }).execute()
    else:
        # 이미 존재한다면, 최신 시세와 업데이트 시각만 수정합니다.
        supabase.table("stocks").update(
            {"current_price": current_price, "last_updated": "now()"}
        ).eq("ticker_symbol", ticker_symbol).execute()


def insert_portfolio_row(
    user_id: str, ticker_symbol: str, avg_price: float, quantity: int
):
    # 동일 유저의 동일 종목 보유 현황이 이미 존재한다면, 평단가 및 수량 가중 평균 조율 처리
    existing = (
        supabase.table("portfolios")
        .select("id", "avg_price", "quantity")
        .eq("user_id", user_id)
        .eq("ticker_symbol", ticker_symbol)
        .execute()
    )

    if existing.data:
        row = existing.data[0]
        row_id = row["id"]
        old_avg = row["avg_price"]
        old_qty = row["quantity"]

        new_qty = old_qty + quantity
        # 0 나누기 방어코드
        if new_qty > 0:
            new_avg = (old_avg * old_qty + avg_price * quantity) / new_qty
        else:
            new_avg = 0.0

        return supabase.table("portfolios").update({
            "avg_price": new_avg,
            "quantity": new_qty
        }).eq("id", row_id).execute()

    portfolio_data = {
        "user_id": user_id,
        "ticker_symbol": ticker_symbol,
        "avg_price": avg_price,
        "quantity": quantity,
    }
    return supabase.table("portfolios").insert(portfolio_data).execute()


def update_portfolio_row(
    item_id: str, avg_price: Optional[float] = None, quantity: Optional[int] = None, user_id: Optional[str] = None
):
    update_data = {}
    if avg_price is not None:
        update_data["avg_price"] = avg_price
    if quantity is not None:
        update_data["quantity"] = quantity

    query = supabase.table("portfolios")
    if not update_data:
        # Nothing to update, but we should still return the existing record if it exists
        q = query.select("*").eq("id", item_id)
        if user_id:
            q = q.eq("user_id", user_id)
        return q.execute()

    q = query.update(update_data).eq("id", item_id)
    if user_id:
        q = q.eq("user_id", user_id)
    return q.execute()


def delete_portfolio_row(item_id: str, user_id: Optional[str] = None):
    query = supabase.table("portfolios").delete().eq("id", item_id)
    if user_id:
        query = query.eq("user_id", user_id)
    return query.execute()


def check_share_group(user_a: str, user_b: str) -> bool:
    """두 사용자가 최소 한 개 이상의 동일한 그룹 모임에 가입되어 있는지 검증합니다."""
    if user_a == user_b:
        return True

    # 1단계: user_a가 가입한 그룹 ID 리스트 추출
    res_a = supabase.table("group_members").select("group_id").eq("user_id", user_a).execute()
    if not res_a.data:
        return False

    group_ids_a = [g["group_id"] for g in res_a.data]

    # 2단계: 그 그룹 ID들 중 user_b가 소속된 행이 단 한 개라도 있는지 조회
    res_b = (
        supabase.table("group_members")
        .select("group_id")
        .in_("group_id", group_ids_a)
        .eq("user_id", user_b)
        .execute()
    )

    return len(res_b.data) > 0


def get_portfolio_summary_for_user(user_id: str) -> dict:
    res = (
        supabase.table("portfolios")
        .select("*, stocks(current_price, name)")
        .eq("user_id", user_id)
        .execute()
    )
    items = res.data
    if not items:
        return {"message": "보유 중인 종목이 없습니다."}

    total_purchase_amount = 0
    total_current_value = 0

    for item in items:
        avg_price = item["avg_price"]
        quantity = item["quantity"]
        
        # stocks 정보가 없거나 조인 결과가 None인 경우를 처리하여 NoneType 에러를 미연에 방지합니다.
        stocks_info = item.get("stocks")
        current_price = stocks_info.get("current_price") if (stocks_info and stocks_info.get("current_price") is not None) else 0

        total_purchase_amount += avg_price * quantity
        total_current_value += current_price * quantity

    total_profit = total_current_value - total_purchase_amount
    total_yield = (
        (total_profit / total_purchase_amount) * 100 if total_purchase_amount > 0 else 0
    )

    return {
        "user_id": user_id,
        "summary": {
            "total_purchase": total_purchase_amount,
            "total_value": total_current_value,
            "total_profit": total_profit,
            "total_yield_percent": round(total_yield, 2),
        },
        "holdings": items,
    }


def search_stocks(query: str, limit: int = 10):
    q = (query or "").strip()
    if not q:
        return []

    pattern = f"%{q}%"
    res = (
        supabase.table("stocks")
        .select("*")
        .or_(f"name.ilike.{pattern},ticker_symbol.ilike.{pattern}")
        .limit(limit)
        .execute()
    )
    return res.data
