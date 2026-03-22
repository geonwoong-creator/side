from fastapi import FastAPI

from api.groups import router as groups_router
from api.stocks import router as stocks_router

app = FastAPI(title="ITYS Backend")

app.include_router(stocks_router, prefix="/portfolio", tags=["portfolio"])
app.include_router(groups_router, prefix="/groups", tags=["groups"])


@app.get("/")
def root():
    return {"message": "ITYS 서버가 정상 작동 중입니다!"}
