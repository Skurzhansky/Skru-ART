# AI House Designer

Веб-платформа для проектирования частных домов онлайн с помощью искусственного интеллекта.

Пользователь описывает пожелания, ИИ-архитектор помогает с планировкой, материалами и бюджетом, а встроенный 2D-редактор и 3D-визуализатор позволяют довести проект до рабочего состояния.

---

## Содержание

1. [Общая архитектура](#общая-архитектура)
2. [Текущие возможности](#текущие-возможности)
3. [Структура проекта](#структура-проекта)
4. [Модели данных](#модели-данных)
5. [API](#api)
6. [Компоненты frontend](#компоненты-frontend)
7. [Быстрый старт](#быстрый-старт)
8. [Переменные окружения](#переменные-окружения)
9. [Рабочий процесс разработки](#рабочий-процесс-разработки)
10. [Тестирование](#тестирование)
11. [Деплой](#деплой)
12. [Roadmap](#roadmap)

---

## Общая архитектура

```
┌─────────────────────────────────────┐
│           Browser (User)            │
└──────────────┬──────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────┐
│  Next.js 16 (Frontend)              │
│  - Auth pages                       │
│  - 2D floor plan editor (SVG)       │
│  - 3D viewer (React Three Fiber)    │
│  - AI chat panel                    │
│  - Cost estimate panel            │
└──────────────┬──────────────────────┘
               │ JSON / REST
┌──────────────▼──────────────────────┐
│  FastAPI (Backend)                  │
│  - JWT auth                         │
│  - Project CRUD                     │
│  - AI chat & plan generation        │
│  - Cost estimation                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────┐  ┌─────────▼──────────┐
│  SQLite (projects, users)│  │  OpenAI API        │
└─────────────────────────┘  └────────────────────┘
```

### Стек технологий

| Слой        | Технология                                 |
|-------------|--------------------------------------------|
| Frontend    | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| 2D/3D       | SVG, React Three Fiber, Three.js         |
| Backend     | Python 3.9+, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| База данных | SQLite (в перспективе PostgreSQL)         |
| AI          | OpenAI API (gpt-4o-mini)                   |
| Auth        | JWT (python-jose) + bcrypt               |

---

## Текущие возможности

### MVP (реализовано)

- [x] Регистрация и вход пользователей (JWT)
- [x] CRUD проектов домов
- [x] 2D-редактор планировки:
  - комнаты как прямоугольники;
  - перетаскивание мышью;
  - редактирование названия, размеров, типа комнаты;
  - отрисовка стен, дверей, окон.
- [x] 3D-визуализация плана (полы + стены)
- [x] Чат с ИИ-архитектором с учётом контекста проекта
- [x] Генерация планировки по текстовому запросу через OpenAI с параметрами (площадь, этажность, стиль, бюджет, комнаты)
- [x] Предварительный расчёт сметы строительства
- [x] Экспорт проекта в JSON

### В планах

- [ ] PDF-экспорт планировки и сметы
- [ ] DXF/SVG экспорт чертежей
- [ ] Больше параметров генерации (этажность, материалы, региональные нормы)
- [ ] Визуализация крыши, лестниц, мебели
- [ ] Коллаборативное редактирование
- [ ] PostgreSQL для продакшена
- [ ] CI/CD и тесты

---

## Структура проекта

```
house-designer-ai/
├── backend/                 # Python FastAPI backend
│   ├── main.py              # Точка входа, endpoints
│   ├── models.py            # SQLAlchemy модели
│   ├── schemas.py           # Pydantic схемы
│   ├── database.py          # Подключение к БД и сессии
│   ├── ai_service.py        # OpenAI: чат и генерация планировки
│   ├── floor_plan_generator.py  # Резервная/rule-based генерация планов
│   ├── cost_estimator.py    # Расчёт сметы
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # Next.js frontend
│   ├── app/
│   │   ├── page.tsx         # Главная: авторизация, список проектов
│   │   ├── layout.tsx       # Корневой layout
│   │   └── project/
│   │       └── [id]/
│   │           └── page.tsx # Страница редактора проекта
│   ├── components/
│   │   ├── FloorPlanEditor.tsx      # 2D-редактор
│   │   ├── House3DViewer.tsx         # 3D-визуализатор
│   │   ├── AIChatPanel.tsx           # Панель чата с ИИ
│   │   └── CostEstimatePanel.tsx     # Панель сметы
│   ├── lib/
│   │   ├── api.ts           # HTTP-клиент (axios) и API-методы
│   │   └── types.ts         # TypeScript типы
│   ├── package.json
│   └── next.config.ts
└── README.md
```

---

## Модели данных

### `User`

| Поле             | Тип      | Описание                        |
|------------------|----------|---------------------------------|
| id               | int      | Первичный ключ                   |
| email            | string   | Уникальный email                 |
| hashed_password  | string   | Хеш пароля (bcrypt)              |
| full_name        | string   | Полное имя (опционально)         |
| created_at       | datetime | Дата регистрации                 |

### `Project`

| Поле              | Тип      | Описание                               |
|-------------------|----------|----------------------------------------|
| id                | int      | Первичный ключ                          |
| title             | string   | Название проекта                        |
| description       | text     | Описание                                |
| parameters        | JSON     | Введённые пользователем параметры       |
| floor_plan        | JSON     | Планировка (rooms, walls, doors, windows) |
| materials_estimate| JSON     | Смета                                   |
| owner_id          | int      | Владелец (FK → users)                  |
| created_at        | datetime | Дата создания                           |
| updated_at        | datetime | Дата обновления                         |

### `FloorPlan` (JSON)

```json
{
  "rooms": [
    {
      "id": 1,
      "name": "Гостиная",
      "type": "living",
      "x": 0,
      "y": 0,
      "width": 5,
      "height": 5
    }
  ],
  "walls": [
    { "x1": 0, "y1": 0, "x2": 5, "y2": 0, "thickness": 0.2 }
  ],
  "doors": [
    { "x": 2, "y": 0, "width": 0.9, "orientation": "horizontal", "room_id": 1 }
  ],
  "windows": [
    { "x": 3, "y": 0, "width": 1.2, "orientation": "horizontal", "room_id": 1 }
  ]
}
```

Координаты в метрах. Начало координат — левый нижний угол дома.

---

## API

Базовый URL: `http://localhost:8000`

### Auth

| Метод | Endpoint            | Описание                    | Auth |
|-------|---------------------|-----------------------------|------|
| POST  | `/auth/register`    | Регистрация                 | —    |
| POST  | `/auth/login`       | Вход, получение JWT         | —    |
| GET   | `/auth/me`          | Текущий пользователь        | Bearer |

### Projects

| Метод  | Endpoint            | Описание                    | Auth |
|--------|---------------------|-----------------------------|------|
| GET    | `/projects`         | Список проектов пользователя | Bearer |
| POST   | `/projects`         | Создать проект              | Bearer |
| GET    | `/projects/{id}`    | Получить проект             | Bearer |
| PATCH  | `/projects/{id}`    | Обновить проект             | Bearer |
| DELETE | `/projects/{id}`    | Удалить проект              | Bearer |

### AI

| Метод | Endpoint             | Описание                            | Auth |
|-------|----------------------|-------------------------------------|------|
| POST  | `/ai/chat`           | Чат с ИИ-архитектором               | —    |
| POST  | `/ai/generate-plan`  | Сгенерировать планировку по запросу | —    |
| POST  | `/ai/estimate`       | Рассчитать смету                    | —    |

### Примеры запросов

#### Регистрация

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123","full_name":"Иван Иванов"}'
```

#### Вход

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=secret123"
```

#### Создание проекта

```bash
curl -X POST http://localhost:8000/projects \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Мой дом","description":"Двухэтажный коттедж"}'
```

#### Генерация планировки

```bash
curl -X POST http://localhost:8000/ai/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Современный одноэтажный дом для семьи из 4 человек",
    "area": 120,
    "floors": 1,
    "style": "минимализм",
    "rooms": ["Гостиная", "Кухня", "Спальня", "Детская", "Ванная"]
  }'
```

#### Расчёт сметы

```bash
curl -X POST http://localhost:8000/ai/estimate \
  -H "Content-Type: application/json" \
  -d '{"floor_plan": {<plan>}, "region_factor": 1.0}'
```

---

## Компоненты frontend

### `FloorPlanEditor`

- Отрисовывает SVG-холст с сеткой.
- Комнаты — кликабельные и перетаскиваемые.
- Панель редактирования выбранной комнаты: название, ширина, глубина, тип.
- Отрисовка стен, дверей (оранжевые) и окон (голубые).

### `House3DViewer`

- React Three Fiber сцена.
- Показывает полы комнат и несущие стены.
- Управление: ЛКМ — вращение, скролл — зум.

### `AIChatPanel`

- История сообщений.
- Отправка запроса к `/ai/chat` с контекстом проекта.
- Кнопка «Сгенерировать планировку ИИ» вызывает `/ai/generate-plan` и обновляет редактор.

### `CostEstimatePanel`

- Региональный коэффициент.
- Запрос к `/ai/estimate`.
- Таблица расходов по статьям и итоговая сумма.

---

## Быстрый старт

### 1. Клонирование и подготовка

```bash
git clone https://github.com/Skurzhansky/Skru-ART.git
cd Skru-ART
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Создайте файл `backend/.env`:

```env
DATABASE_URL=sqlite:///./house_designer.db
OPENAI_API_KEY=sk-your-openai-key-here
SECRET_KEY=your-secret-key-for-jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Запуск:

```bash
python main.py
```

Сервер запустится на `http://localhost:8000`.

### 3. Frontend

```bash
cd frontend
npm install
```

Создайте файл `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Запуск:

```bash
npm run dev
```

Frontend откроется на `http://localhost:3000`.

---

## Переменные окружения

### Backend (`.env`)

| Переменная                | Описание                                  | По умолчанию                 |
|---------------------------|-------------------------------------------|------------------------------|
| `DATABASE_URL`            | URL базы данных SQLAlchemy                | `sqlite:///./house_designer.db` |
| `OPENAI_API_KEY`          | API-ключ OpenAI                           | — (обязательно для ИИ)       |
| `SECRET_KEY`              | Секретный ключ для подписи JWT            | —                            |
| `ALGORITHM`               | Алгоритм подписи JWT                      | `HS256`                      |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Время жизни токена в минутах          | `60`                         |

### Frontend (`.env.local`)

| Переменная          | Описание                  | По умолчанию            |
|---------------------|---------------------------|-------------------------|
| `NEXT_PUBLIC_API_URL` | URL backend API          | `http://localhost:8000` |

---

## Рабочий процесс разработки

1. **Перед изменениями** — обсудить фичу/баг в README/Roadmap.
2. **Backend** — добавить endpoint/модель/сервис, обновить `schemas.py`.
3. **Frontend** — добавить компонент/метод в `lib/api.ts`, использовать в `app/`.
4. **Типизация** — обновить `lib/types.ts` при изменении JSON-моделей.
5. **Сборка** — запустить `npm run build` в `frontend` и `python main.py` в `backend`.
6. **Коммит** — краткое сообщение на русском или английском, описывающее **зачем** сделано изменение.

### Правила по стеку

- Backend: пишем на Python 3.9+, используем type hints, SQLAlchemy 2.0 синтаксис.
- Frontend: React-компоненты клиентские помечаем `"use client"`; серверные страницы — по умолчанию.
- Используем Tailwind CSS для стилей, избегаем кастомных CSS-файлов без необходимости.
- Никогда не коммитим секреты, `.env`, `venv/` и `node_modules/`.

---

## Тестирование

### Backend

```bash
cd backend
source venv/bin/activate
pytest
```

> Пока тесты не написаны — это следующий шаг в roadmap.

### Frontend

```bash
cd frontend
npm run build
npm run lint
```

### Ручное тестирование

1. Зарегистрироваться на главной.
2. Создать проект.
3. Открыть редактор.
4. Сгенерировать планировку через ИИ (нужен `OPENAI_API_KEY`).
5. Отредактировать комнаты в 2D.
6. Переключиться в 3D.
7. Рассчитать смету.
8. Сохранить и экспортировать JSON.

---

## Деплой

### Backend

Подходит любой хостинг с поддержкой Python + ASGI (Render, Railway, Fly.io, AWS EC2).

Пример для Render:

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port 10000`
- Добавить переменные окружения из `.env`.
- Для продакшена рекомендуется PostgreSQL вместо SQLite.

### Frontend

Оптимально деплоить на Vercel:

- Подключить репозиторий GitHub.
- Root directory: `frontend`
- Добавить `NEXT_PUBLIC_API_URL=<backend-url>`.
- Framework preset: Next.js.

### CORS

При деплое обновить `origins` в `backend/main.py`, добавив домен frontend.

---

## Roadmap

### v0.2 — Улучшение редактора

- [x] Привязка комнат к сетке и стенам
- [x] Добавление/удаление комнат в редакторе
- [x] Отмена/повтор действий
- [ ] Масштабирование и панорамирование холста

### v0.3 — AI и параметры

- [x] Промпт с выбором этажности, площади, стиля, бюджета и комнат
- [ ] Генерация нескольких вариантов планировки
- [ ] Рекомендации по материалам от ИИ
- [ ] Оценка энергоэффективности

### v0.4 — Экспорт и документация

- [ ] PDF-экспорт плана и сметы
- [ ] DXF/SVG экспорт
- [ ] Печать технических характеристик дома

### v0.5 — Платформа

- [ ] PostgreSQL
- [ ] Загрузка фото участка
- [ ] Совместный доступ к проекту
- [ ] Платежи и тарифы

---

## Лицензия

Проект разрабатывается как приватный прототип. Лицензия будет добавлена позже.
