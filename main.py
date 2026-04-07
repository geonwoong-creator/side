from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

# 2. 다른 파일에서 만든 라우터와 스케줄러 가져오기
from api.auth import router as auth_router
from api.groups import router as groups_router
from api.stocks import router as stocks_router
from scheduler import scheduler # scheduler.py에 있는 scheduler 객체

# 3. lifespan 함수를 '먼저' 정의합니다. (FastAPI 선언보다 위에!)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # [StartUp] 서버가 켜질 때 실행
    print("⏰ 스케줄러가 가동되었습니다. (장 중 1시간마다 시세 업데이트)")
    if not scheduler.running:
        scheduler.start()
    
    yield # 서버가 돌아가는 중...
    
    # [Shutdown] 서버가 꺼질 때 실행
    print("💤 스케줄러를 종료합니다.")
    scheduler.shutdown()

# 4. 이제 정의된 lifespan을 넣어줍니다.
app = FastAPI(title="ITYS Backend", lifespan=lifespan)

# CORS 설정 (프론트엔드 연결용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(stocks_router, prefix="/portfolio", tags=["portfolio"])
app.include_router(groups_router, prefix="/groups", tags=["groups"])

@app.get("/")
def root():
    return {"message": "ITYS 서버가 정상 작동 중입니다!"}
