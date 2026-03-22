from supabase import create_client

from core.config import SUPABASE_KEY, SUPABASE_URL

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL 또는 Key가 설정되지 않았습니다. .env 파일을 확인하세요!")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
