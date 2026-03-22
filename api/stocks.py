from fastapi import APIRouter, HTTPException

from models.schemas import StockCreate
from services import stock_logic

router = APIRouter()


@router.post("/add")
async def add_to_portfolio(item: StockCreate):
    try:
        current_price = stock_logic.fetch_current_price(item.ticker_symbol)
        stock_logic.sync_stock_current_price(item.ticker_symbol, current_price)
        response = stock_logic.insert_portfolio_row(
            item.user_id,
            item.ticker_symbol,
            item.avg_price,
            item.quantity,
        )
        return {
            "status": "success",
            "message": f"{item.ticker_symbol} 추가 완료",
            "current_price": current_price,
            "data": response.data,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/summary/{user_id}")
async def get_portfolio_summary(user_id: str):
    try:
        result = stock_logic.get_portfolio_summary_for_user(user_id)
        if "message" in result and "summary" not in result:
            return result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
