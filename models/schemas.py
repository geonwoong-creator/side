from pydantic import BaseModel


class StockCreate(BaseModel):
    user_id: str
    ticker_symbol: str
    avg_price: float
    quantity: int


class GroupCreate(BaseModel):
    user_id: str
    group_name: str

class ProfileUpdate(BaseModel):
    user_id: str
    nickname: str