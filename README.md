# MIRAEDOJEON - Web GUI Integration

## 🚀 빠른 시작

### Windows에서 실행

```bash
# 방법 1: 배치 스크립트 실행 (권장)
start.bat

# 방법 2: npm 명령어 실행
npm start
```

### 첫 실행 시 의존성 설치

```bash
# 방법 1: 설치 스크립트 실행
install.bat

# 방법 2: npm 명령어 실행
npm run install:all
```

## 📁 프로젝트 구조

```
miraedojeon/
├── front/          # React + Vite 프론트엔드 (포트: 5173)
├── backend/        # Node.js + Python FastAPI 백엔드
│   ├── mongoDB_server.js     # MongoDB 서버 (포트: 3000)
│   └── Neo4j_server.py       # Neo4j FastAPI 서버 (포트: 8000)
├── start.bat       # 전체 프로젝트 시작 스크립트
└── install.bat     # 전체 의존성 설치 스크립트
```

## 🌐 서버 주소

- **Frontend**: http://localhost:5173
- **Backend (Node.js)**: http://localhost:3000
- **Backend (Python FastAPI)**: http://localhost:8000

## 📝 사용 가능한 명령어

```bash
npm start              # Frontend + Backend 모두 시작
npm run start:frontend # Frontend만 시작
npm run start:backend  # Backend만 시작
npm run install:all    # 모든 의존성 설치
npm run build          # Frontend 빌드
```

## ⚙️ 개별 실행

필요시 각 서버를 개별적으로 실행할 수 있습니다:

```bash
# Backend 실행
cd backend
npm start

# Frontend 실행  
cd front
npm start
```

## 🛠️ 기술 스택

### Frontend
- React 18
- Vite
- Material-UI
- React Router

### Backend
- **Node.js**: Express, MongoDB
- **Python**: FastAPI, Neo4j, Uvicorn
