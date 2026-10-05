from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class FloorPlan(BaseModel):
    rooms: List[Dict[str, Any]]
    walls: List[Dict[str, Any]]
    doors: List[Dict[str, Any]]
    windows: List[Dict[str, Any]]


class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    floor_plan: Optional[Dict[str, Any]] = None
    materials_estimate: Optional[Dict[str, Any]] = None


class ProjectRead(ProjectBase):
    id: int
    floor_plan: Optional[Dict[str, Any]] = None
    materials_estimate: Optional[Dict[str, Any]] = None
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    project_context: Optional[Dict[str, Any]] = None


class GeneratePlanRequest(BaseModel):
    prompt: str
    area: Optional[float] = None
    floors: Optional[int] = 1
    budget: Optional[float] = None
    style: Optional[str] = None
    rooms: Optional[List[str]] = None


class EstimateRequest(BaseModel):
    floor_plan: Dict[str, Any]
    region_factor: Optional[float] = 1.0
