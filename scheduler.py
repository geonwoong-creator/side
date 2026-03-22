from apscheduler.schedulers.background import BackgroundScheduler
import FinanceDataReader as fdr
from apscheduler.triggers.cron import CronTrigger # 크론 트리거 추가
from core.database import supabase

def update_stock_prices():
    print("🔄 [Scheduler] 시세 업데이트 시작...")
    
    # 1. 사용자들이 보유한 종목 코드만 중복 없이 가져오기
    res = supabase.table("portfolios").select("ticker_symbol").execute()
    symbols = list(set([item['ticker_symbol'] for item in res.data]))
    
    if not symbols:
        print("ℹ️ 업데이트할 보유 종목이 없습니다.")
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
            
            print(f"✅ {symbol} 업데이트 완료: {current_price}원")
        except Exception as e:
            print(f"❌ {symbol} 업데이트 실패: {e}")

scheduler = BackgroundScheduler()

# 💡 수정된 부분: 월-금(mon-fri), 9시-16시 사이, 매 정각(0분)에 실행
trigger = CronTrigger(
    day_of_week='mon-fri', 
    hour='9-16', 
    minute='0', 
    timezone='Asia/Seoul' # 한국 시간 기준 필수!
)

scheduler.add_job(update_stock_prices, trigger=trigger)