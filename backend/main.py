import os
import secrets
import shutil
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import User, Project
from schemas import (
    UserCreate,
    UserRead,
    Token,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    ChatRequest,
    GeneratePlanRequest,
    EstimateRequest,
    MaterialsRequest,
    EnergyRequest,
    ExportRequest,
    ProjectPublicRead,
)
from ai_service import (
    chat_with_ai,
    generate_floor_plan_from_prompt,
    generate_floor_plan_variants,
    recommend_materials,
    assess_energy_efficiency,
)
from floor_plan_generator import generate_rectangular_plan
from cost_estimator import estimate_costs
from export_service import generate_plan_pdf, generate_plan_dxf, generate_plan_svg, generate_project_report

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="AI House Designer API", version="0.1.0")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except (JWTError, ValueError):
        return None


def get_current_user_required(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = get_current_user(token, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@app.get("/")
def read_root():
    return {"message": "AI House Designer API"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user_required)):
    return current_user


@app.get("/projects", response_model=List[ProjectRead])
def list_projects(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    return db.query(Project).filter(Project.owner_id == current_user.id).all()


@app.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    project = Project(
        title=project_in.title,
        description=project_in.description,
        parameters=project_in.parameters,
        owner_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get("/projects/{project_id}", response_model=ProjectRead)
def read_project(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.patch("/projects/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in project_in.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return project


@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return None


@app.post("/projects/{project_id}/photo", response_model=ProjectRead)
def upload_site_photo(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    filename = f"site_{project_id}_{secrets.token_hex(8)}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    project.site_photo_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(project)
    return project


@app.get("/projects/{project_id}/photo")
def get_site_photo(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project or not project.site_photo_url:
        raise HTTPException(status_code=404, detail="Photo not found")
    filepath = os.path.join(UPLOAD_DIR, os.path.basename(project.site_photo_url))
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Photo file not found")
    with open(filepath, "rb") as f:
        return Response(content=f.read(), media_type="image/jpeg")


@app.post("/projects/{project_id}/share", response_model=ProjectRead)
def share_project(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.public_token:
        project.public_token = secrets.token_urlsafe(24)
    project.is_public = 1
    db.commit()
    db.refresh(project)
    return project


@app.post("/projects/{project_id}/unshare", response_model=ProjectRead)
def unshare_project(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.is_public = 0
    db.commit()
    db.refresh(project)
    return project


@app.get("/public/{public_token}", response_model=ProjectPublicRead)
def get_public_project(public_token: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(
        Project.public_token == public_token,
        Project.is_public == 1,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not public")
    return project


@app.post("/ai/chat")
def chat(payload: ChatRequest):
    answer = chat_with_ai(
        messages=[m.model_dump() for m in payload.messages],
        project_context=payload.project_context,
    )
    return {"answer": answer}


@app.post("/ai/generate-plan")
def generate_plan(payload: GeneratePlanRequest):
    plan = generate_floor_plan_from_prompt(
        prompt=payload.prompt,
        area=payload.area,
        floors=payload.floors,
        budget=payload.budget,
        style=payload.style,
        rooms=payload.rooms,
    )
    if not plan.get("rooms"):
        plan = generate_rectangular_plan(
            width=(payload.area or 100) ** 0.5,
            depth=(payload.area or 100) ** 0.5,
            rooms=payload.rooms,
        )
    return plan


@app.post("/ai/generate-plan-variants")
def generate_plan_variants(payload: GeneratePlanRequest):
    variants = generate_floor_plan_variants(
        prompt=payload.prompt,
        area=payload.area,
        floors=payload.floors,
        budget=payload.budget,
        style=payload.style,
        rooms=payload.rooms,
    )
    return {"variants": variants}


@app.post("/ai/materials")
def materials(payload: MaterialsRequest):
    return recommend_materials(
        floor_plan=payload.floor_plan,
        parameters=payload.parameters,
        style=payload.style,
        budget=payload.budget,
        region_factor=payload.region_factor or 1.0,
    )


@app.post("/ai/energy")
def energy(payload: EnergyRequest):
    return assess_energy_efficiency(
        floor_plan=payload.floor_plan,
        parameters=payload.parameters,
        style=payload.style,
        climate_zone=payload.climate_zone,
        heating_type=payload.heating_type,
        region_factor=payload.region_factor or 1.0,
    )


@app.post("/ai/estimate")
def estimate(payload: EstimateRequest):
    return estimate_costs(payload.floor_plan, region_factor=payload.region_factor or 1.0)


def _safe_filename(name: str) -> str:
    import unicodedata
    import re
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^\w\-.]", "_", normalized)
    return normalized or "project"


@app.post("/export/pdf")
def export_pdf(payload: ExportRequest):
    pdf_bytes = generate_plan_pdf(
        project_title=payload.title,
        project_description=payload.description,
        floor_plan=payload.floor_plan,
        estimate=estimate_costs(payload.floor_plan, region_factor=payload.region_factor or 1.0),
        parameters=payload.parameters,
    )
    filename = _safe_filename(payload.title)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )


@app.post("/export/svg")
def export_svg(payload: ExportRequest):
    svg_text = generate_plan_svg(payload.floor_plan)
    filename = _safe_filename(payload.title)
    return Response(
        content=svg_text,
        media_type="image/svg+xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}.svg"'},
    )


@app.post("/export/dxf")
def export_dxf(payload: ExportRequest):
    dxf_text = generate_plan_dxf(payload.floor_plan)
    filename = _safe_filename(payload.title)
    return Response(
        content=dxf_text,
        media_type="application/dxf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.dxf"'},
    )


@app.post("/export/report")
def export_report(payload: ExportRequest):
    report_text = generate_project_report(
        project_title=payload.title,
        project_description=payload.description,
        floor_plan=payload.floor_plan,
        estimate=estimate_costs(payload.floor_plan, region_factor=payload.region_factor or 1.0),
        parameters=payload.parameters,
    )
    filename = _safe_filename(payload.title)
    return Response(
        content=report_text,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}-report.txt"'},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
