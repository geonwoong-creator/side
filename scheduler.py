from apscheduler.schedulers.background import BackgroundScheduler
import FinanceDataReader as fdr
from apscheduler.triggers.cron import CronTrigger
from core.database import supabase
from services import post_logic

def update_stock_prices():
    print("🔄 [Scheduler] 시세 업데이트 시작...")
    
    # 1. 사용자들이 보유한 종목 + 예측 중인 종목 코드 가져오기
    portfolio_res = supabase.table("portfolios").select("ticker_symbol").execute()
    # status가 pending인 게시글의 종목도 업데이트 대상에 포함
    posts_res = supabase.table("group_posts").select("ticker_symbol").eq("status", "pending").execute()
    
    symbols = list(set(
        [item['ticker_symbol'] for item in portfolio_res.data] + 
        [item['ticker_symbol'] for item in posts_res.data]
    ))
    
    if not symbols:
        print("ℹ️ 업데이트할 보유/예측 종목이 없습니다.")
        return

    for symbol in symbols:
        try:
            # 2. 최신가 긁어오기
            df = fdr.DataReader(symbol)
            current_price = int(df['Close'].iloc[-1])
            
            # 3. DB 업데이트
            supabase.table("stocks").update({
                "current_price": current_price,
                "last_updated": "now()"
            }).eq("ticker_symbol", symbol).execute()
            
            # 4. 박제된 게시글 성공 여부 체크
            post_logic.check_and_update_posts_status(symbol, current_price)
            
            print(f"✅ {symbol} 업데이트 완료: {current_price}원")
        except Exception as e:
            print(f"❌ {symbol} 업데이트 실패: {e}")

scheduler = BackgroundScheduler()

# 월-금(mon-fri), 9시-16시 사이, 매 정각(0분)에 실행
trigger = CronTrigger(
    day_of_week='mon-fri', 
    hour='9-16', 
    minute='0', 
    timezone='Asia/Seoul'
)

scheduler.add_job(update_stock_prices, trigger=trigger)
