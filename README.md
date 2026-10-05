# AI House Designer

Веб-платформа для проектирования частных домов с помощью искусственного интеллекта.

## Архитектура

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI + SQLAlchemy + SQLite
- **3D**: React Three Fiber / Three.js
- **AI**: OpenAI API (GPT-4o-mini)

## Возможности MVP

- Регистрация и аутентификация пользователей (JWT)
- Создание и управление проектами домов
- 2D-редактор планировки (SVG, перетаскивание комнат, изменение размеров)
- 3D-визуализация дома
- Чат с ИИ-архитектором
- Генерация планировки по запросу через OpenAI
- Предварительный расчет сметы строительства
- Сохранение проектов в базе данных

## Быстрый старт

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Создайте файл `.env` в папке `backend`:

```env
DATABASE_URL=sqlite:///./house_designer.db
OPENAI_API_KEY=sk-your-openai-key-here
SECRET_KEY=your-secret-key-for-jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Запустите сервер:

```bash
python main.py
```

Backend будет доступен по адресу http://localhost:8000.

### Frontend

```bash
cd frontend
npm install
```

Создайте файл `.env.local` в папке `frontend`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Запустите dev-сервер:

```bash
npm run dev
```

Frontend будет доступен по адресу http://localhost:3000.

## Структура backend

- `main.py` — основное FastAPI-приложение, эндпоинты
- `models.py` — модели SQLAlchemy (User, Project)
- `schemas.py` — Pydantic-схемы
- `database.py` — подключение к SQLite
- `ai_service.py` — интеграция с OpenAI
- `floor_plan_generator.py` — fallback-генератор планировок
- `cost_estimator.py` — расчет сметы

## Структура frontend

- `app/page.tsx` — главная страница с авторизацией и списком проектов
- `app/project/[id]/page.tsx` — редактор проекта
- `components/FloorPlanEditor.tsx` — 2D-редактор
- `components/House3DViewer.tsx` — 3D-визуализация
- `components/AIChatPanel.tsx` — чат с ИИ
- `components/CostEstimatePanel.tsx` — смета

## API endpoints

- `POST /auth/register` — регистрация
- `POST /auth/login` — вход
- `GET /auth/me` — текущий пользователь
- `GET /projects` — список проектов
- `POST /projects` — создать проект
- `GET /projects/{id}` — получить проект
- `PATCH /projects/{id}` — обновить проект
- `DELETE /projects/{id}` — удалить проект
- `POST /ai/chat` — чат с ИИ
- `POST /ai/generate-plan` — сгенерировать планировку
- `POST /ai/estimate` — рассчитать смету
