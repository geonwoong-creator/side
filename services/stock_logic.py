import FinanceDataReader as fdr

from core.database import supabase


def fetch_current_price(ticker_symbol: str) -> int:
    df = fdr.DataReader(ticker_symbol)
    if df.empty:
        raise ValueError("존재하지 않는 종목코드입니다.")
    return int(df["Close"].iloc[-1])


def sync_stock_current_price(ticker_symbol: str, current_price: int) -> None:
    supabase.table("stocks").update(
        {"current_price": current_price, "last_updated": "now()"}
    ).eq("ticker_symbol", ticker_symbol).execute()


def insert_portfolio_row(
    user_id: str, ticker_symbol: str, avg_price: float, quantity: int
):
    portfolio_data = {
        "user_id": user_id,
        "ticker_symbol": ticker_symbol,
        "avg_price": avg_price,
        "quantity": quantity,
    }
    return supabase.table("portfolios").insert(portfolio_data).execute()


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
        current_price = item["stocks"]["current_price"] or 0

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
