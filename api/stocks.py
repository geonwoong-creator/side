from fastapi import APIRouter, HTTPException, Depends
from core.security import get_current_user
from models.schemas import StockCreate, StockUpdate
from services import stock_logic

router = APIRouter()


@router.post("/add")
async def add_to_portfolio(item: StockCreate, current_user = Depends(get_current_user)):
    # 보안 검증(IDOR 가드): 본인의 포트폴리오에만 추가할 수 있음
    if item.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="다른 사용자의 포트폴리오에 자산을 추가할 권한이 없습니다."
        )

    # 비정상 데이터 방어 (음수 및 0 차단)
    if item.avg_price <= 0 or item.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="평균 매수가와 수량은 0보다 큰 양수여야 합니다."
        )

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
async def remove_stock(item_id: str, current_user = Depends(get_current_user)):
    try:
        # 보안 검증(IDOR 가드): 본인 소유의 포트폴리오 행만 삭제할 수 있도록 user_id 검증 필터 주입
        res = stock_logic.delete_portfolio_row(item_id, user_id=current_user.id)
        
        if not res.data:
            raise HTTPException(status_code=404, detail="삭제할 항목을 찾을 수 없거나 권한이 없습니다.")
            
        return {"status": "success", "message": "포트폴리오에서 삭제되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update/{item_id}")
async def update_stock(item_id: str, item: StockUpdate, current_user = Depends(get_current_user)):
    # 비정상 데이터 방어 (음수 및 0 차단)
    if (item.avg_price is not None and item.avg_price <= 0) or (item.quantity is not None and item.quantity <= 0):
        raise HTTPException(
            status_code=400,
            detail="수정할 평균 매수가와 수량은 0보다 큰 양수여야 합니다."
        )

    try:
        # 보안 검증(IDOR 가드): 본인 소유의 포트폴리오 행만 수정할 수 있도록 user_id 검증 필터 주입
        res = stock_logic.update_portfolio_row(item_id, item.avg_price, item.quantity, user_id=current_user.id)
        
        if not res.data:
            raise HTTPException(status_code=404, detail="수정할 항목을 찾을 수 없거나 권한이 없습니다.")
            
        return {"status": "success", "message": "성공적으로 수정되었습니다.", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{user_id}")
async def get_portfolio_summary(user_id: str, current_user = Depends(get_current_user)):
    # 보안 검증(IDOR 가드):
    # 1. 본인 자산 조회는 무조건 허용
    # 2. 타인의 자산인 경우, 두 유저가 최소 하나 이상의 프라이빗 그룹을 공유하고 있는지 검사
    if user_id != current_user.id:
        if not stock_logic.check_share_group(current_user.id, user_id):
            raise HTTPException(
                status_code=403,
                detail="동일한 소속 그룹이 아닌 타인의 자산 현황을 조회할 권한이 없습니다."
            )

    try:
        result = stock_logic.get_portfolio_summary_for_user(user_id)
        if "message" in result and "summary" not in result:
            return result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/search")
async def search_stocks(query: str, current_user = Depends(get_current_user)):
    try:
        return stock_logic.search_stocks(query=query, limit=20)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e