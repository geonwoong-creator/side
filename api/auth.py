from fastapi import APIRouter, HTTPException
from core.database import supabase
from models.schemas import UserAuth, UserSignup

router = APIRouter()

@router.post("/signup")
async def signup(item: UserSignup):
    try:
        # 1. Supabase Auth 회원가입
        auth_res = supabase.auth.sign_up({
            "email": item.email,
            "password": item.password
        })
        
        if not auth_res.user:
            raise HTTPException(status_code=400, detail="회원가입에 실패했습니다.")
            
        user_id = auth_res.user.id
        
        # 2. profiles 테이블에 닉네임 저장
        profile_res = supabase.table("profiles").insert({
            "id": user_id,
            "nickname": item.nickname
        }).execute()
        
        return {
            "status": "success", 
            "message": "회원가입이 완료되었습니다.",
            "user_id": user_id,
            "nickname": item.nickname
        }
    except Exception as e:
        # 에러 발생 시 처리 (이미 가입된 이메일이나 중복된 닉네임 등)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(item: UserAuth):
    try:
        # Supabase Auth 로그인
        auth_res = supabase.auth.sign_in_with_password({
            "email": item.email,
            "password": item.password
        })
        
        if not auth_res.session:
            raise HTTPException(status_code=401, detail="로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.")
            
        # 프로필 정보 가져오기 (닉네임 등)
        profile_res = supabase.table("profiles").select("nickname").eq("id", auth_res.user.id).execute()
        nickname = profile_res.data[0]["nickname"] if profile_res.data else None
        
        return {
            "status": "success",
            "access_token": auth_res.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": auth_res.user.id,
                "email": auth_res.user.email,
                "nickname": nickname
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
