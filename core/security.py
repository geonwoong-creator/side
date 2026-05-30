from fastapi import Header, HTTPException, status
from core.database import supabase

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요한 서비스입니다. 인증 헤더가 누락되었습니다."
        )
    
    try:
        # Bearer <token> 포맷 파싱
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="올바르지 않은 인증 헤더 형식입니다. Bearer <토큰> 형식이어야 합니다."
            )
        
        token = parts[1]
        
        # Supabase Auth 서비스에 JWT 토큰 검증 위임
        user_res = supabase.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않거나 만료된 세션 토큰입니다. 다시 로그인해 주세요."
            )
            
        return user_res.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"인증 검증 실패: {str(e)}"
        )
