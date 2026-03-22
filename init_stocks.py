import FinanceDataReader as fdr
import pandas as pd

from core.database import supabase

def init_stock_master():
    print("🚀 국내 주식 종목 리스트를 가져오는 중...")
    
    # 2. KRX(코스피, 코스닥, 코넥스) 전체 종목 리스트 가져오기
    df_krx = fdr.StockListing('KRX')
    
    # 3. 필요한 컬럼만 추출 (종목코드, 종목명)
    # Symbol: 종목코드, Name: 종목명
    stocks_data = df_krx[['Code', 'Name']].rename(columns={
        'Code': 'ticker_symbol',
        'Name': 'name'
    }).to_dict(orient='records')

    print(f"📦 총 {len(stocks_data)}개의 종목을 Supabase에 저장합니다...")

    # 4. Supabase의 stocks 테이블에 대량 삽입 (Upsert: 있으면 업데이트, 없으면 삽입)
    # 한 번에 너무 많이 넣으면 에러가 날 수 있으니 100개씩 끊어서 넣습니다.
    batch_size = 100
    for i in range(0, len(stocks_data), batch_size):
        batch = stocks_data[i:i + batch_size]
        supabase.table("stocks").upsert(batch).execute()
        print(f"✅ {i + len(batch)}개 완료...")

    print("🎉 모든 종목 리스트가 성공적으로 등록되었습니다!")

if __name__ == "__main__":
    init_stock_master()