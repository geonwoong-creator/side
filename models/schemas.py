from typing import Optional

from pydantic import BaseModel


class UserAuth(BaseModel):
    email: str
    password: str


class UserSignup(BaseModel):
    email: str
    password: str
    nickname: str


class StockCreate(BaseModel):
    user_id: str
    ticker_symbol: str
    avg_price: float
    quantity: int


class StockUpdate(BaseModel):
    avg_price: Optional[float] = None
    quantity: Optional[int] = None


class GroupCreate(BaseModel):
    user_id: str
    group_name: str

class PostCreate(BaseModel):
    user_id: str
    ticker_symbol: str
    target_price: int
    prediction_type: str  # "RISE" or "FALL"
    target_date: str      # "YYYY-MM-DD"

class ProfileUpdate(BaseModel):
    user_id: str
    nickname: str