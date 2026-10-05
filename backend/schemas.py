from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import re


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @validator("password")
    def password_strength(cls, v):
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Пароль должен содержать буквы и цифры")
        return v


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
    site_photo_url: Optional[str] = None
    is_public: Optional[int] = None


class ProjectRead(ProjectBase):
    id: int
    floor_plan: Optional[Dict[str, Any]] = None
    materials_estimate: Optional[Dict[str, Any]] = None
    site_photo_url: Optional[str] = None
    is_public: int = 0
    public_token: Optional[str] = None
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectPublicRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    floor_plan: Optional[Dict[str, Any]] = None
    site_photo_url: Optional[str] = None
    created_at: datetime

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


class MaterialsRequest(BaseModel):
    floor_plan: Dict[str, Any]
    parameters: Optional[Dict[str, Any]] = None
    style: Optional[str] = None
    budget: Optional[float] = None
    region_factor: Optional[float] = 1.0


class EnergyRequest(BaseModel):
    floor_plan: Dict[str, Any]
    parameters: Optional[Dict[str, Any]] = None
    style: Optional[str] = None
    climate_zone: Optional[str] = None
    heating_type: Optional[str] = None
    region_factor: Optional[float] = 1.0


class ExportRequest(EnergyRequest):
    title: str = "Проект дома"
    description: Optional[str] = None


class FeedbackCreate(BaseModel):
    message: str
    email: Optional[str] = None


class FeedbackRead(BaseModel):
    id: int
    message: str
    email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
