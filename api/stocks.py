from fastapi import APIRouter, HTTPException

from models.schemas import StockCreate, StockUpdate
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

@router.delete("/remove/{item_id}")
async def remove_stock(item_id: str):
    try:
        # portfolios 테이블에서 해당 id를 가진 행을 삭제
        res = stock_logic.delete_portfolio_row(item_id)
        
        if not res.data:
            raise HTTPException(status_code=404, detail="삭제할 항목을 찾을 수 없습니다.")
            
        return {"status": "success", "message": "포트폴리오에서 삭제되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update/{item_id}")
async def update_stock(item_id: str, item: StockUpdate):
    try:
        res = stock_logic.update_portfolio_row(item_id, item.avg_price, item.quantity)
        
        if not res.data:
            raise HTTPException(status_code=404, detail="수정할 항목을 찾을 수 없습니다.")
            
        return {"status": "success", "message": "성공적으로 수정되었습니다.", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{user_id}")
async def get_portfolio_summary(user_id: str):
    try:
        result = stock_logic.get_portfolio_summary_for_user(user_id)
        if "message" in result and "summary" not in result:
            return result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
