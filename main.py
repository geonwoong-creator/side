from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import FinanceDataReader as fdr
from database import supabase
import uuid
import secrets

app = FastAPI(title="ITYS Backend")

# 데이터 입력을 위한 규격 (Request Body)
class StockCreate(BaseModel):
    user_id: str      # Supabase Auth의 UUID
    ticker_symbol: str
    avg_price: float
    quantity: int

@app.get("/")
def root():
    return {"message": "ITYS 서버가 정상 작동 중입니다!"}

@app.post("/portfolio/add")
async def add_to_portfolio(item: StockCreate):
    try:
        # 1. FDR로 최신 가격 가져오기
        df = fdr.DataReader(item.ticker_symbol)
        if df.empty:
            raise HTTPException(status_code=404, detail="존재하지 않는 종목코드입니다.")
        
        current_price = int(df['Close'].iloc[-1])

        # 2. stocks 테이블의 현재가 최신화
        supabase.table("stocks").update({
            "current_price": current_price,
            "last_updated": "now()"
        }).eq("ticker_symbol", item.ticker_symbol).execute()

        # 3. 내 포트폴리오에 저장
        portfolio_data = {
            "user_id": item.user_id,
            "ticker_symbol": item.ticker_symbol,
            "avg_price": item.avg_price,
            "quantity": item.quantity
        }
        response = supabase.table("portfolios").insert(portfolio_data).execute()

        return {
            "status": "success",
            "message": f"{item.ticker_symbol} 추가 완료",
            "current_price": current_price,
            "data": response.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/portfolio/summary/{user_id}")
async def get_portfolio_summary(user_id: str):
    try:
        # 1. 사용자의 포트폴리오 가져오기
        # .select("*, stocks(*)") 를 사용하면 관련 종목 정보(현재가 등)를 한 번에 가져옵니다.
        res = supabase.table("portfolios").select("*, stocks(current_price, name)").eq("user_id", user_id).execute()
        
        items = res.data
        if not items:
            return {"message": "보유 중인 종목이 없습니다."}

        total_purchase_amount = 0  # 총 매수 금액
        total_current_value = 0    # 총 평가 금액

        for item in items:
            avg_price = item['avg_price']
            quantity = item['quantity']
            current_price = item['stocks']['current_price'] or 0
            
            total_purchase_amount += (avg_price * quantity)
            total_current_value += (current_price * quantity)

        # 2. 수익률 계산
        total_profit = total_current_value - total_purchase_amount
        total_yield = (total_profit / total_purchase_amount) * 100 if total_purchase_amount > 0 else 0

        return {
            "user_id": user_id,
            "summary": {
                "total_purchase": total_purchase_amount,
                "total_value": total_current_value,
                "total_profit": total_profit,
                "total_yield_percent": round(total_yield, 2)
            },
            "holdings": items # 상세 보유 내역
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))    

# 그룹 생성을 위한 데이터 규격
class GroupCreate(BaseModel):
    user_id: str
    group_name: str

@app.post("/groups/create")
async def create_group(item: GroupCreate):
    # 1. 랜덤 초대 코드 생성 (6자리 영문+숫자)
    invite_code = secrets.token_hex(3).upper() 

    # 2. 그룹 테이블에 삽입
    group_res = supabase.table("groups").insert({
        "name": item.group_name,
        "invite_code": invite_code
    }).execute()
    
    group_id = group_res.data[0]['id']

    # 3. 그룹 만든 사람을 멤버로 자동 추가
    supabase.table("group_members").insert({
        "group_id": group_id,
        "user_id": item.user_id,
        "is_amount_visible": True # 방장은 기본적으로 공개 (선택 가능)
    }).execute()

    return {"status": "success", "group_id": group_id, "invite_code": invite_code}

@app.post("/groups/join")
async def join_group(user_id: str, invite_code: str):
    # 1. 초대 코드로 그룹 찾기
    group_res = supabase.table("groups").select("id").eq("invite_code", invite_code).execute()
    if not group_res.data:
        raise HTTPException(status_code=404, detail="잘못된 초대 코드입니다.")
    
    group_id = group_res.data[0]['id']

    # 2. 멤버 추가
    try:
        supabase.table("group_members").insert({
            "group_id": group_id,
            "user_id": user_id
        }).execute()
        return {"status": "success", "message": "그룹에 참여했습니다."}
    except Exception:
        return {"status": "error", "message": "이미 참여 중인 그룹입니다."}