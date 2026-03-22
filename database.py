import os
from dotenv import load_dotenv
from supabase import create_client

# 1. .env 파일의 내용을 로드합니다.
load_dotenv()

# 2. os.getenv를 통해 값을 가져옵니다.
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# 3. 클라이언트 생성
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL 또는 Key가 설정되지 않았습니다. .env 파일을 확인하세요!")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)