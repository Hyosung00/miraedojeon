@echo off
echo ========================================
echo  MIRAEDOJEON 프로젝트 시작
echo ========================================
echo.

REM 의존성 설치 여부 확인
if not exist "node_modules\" (
    echo [1/3] 루트 의존성 설치 중...
    call npm install
)

if not exist "backend\node_modules\" (
    echo [2/3] Backend 의존성 설치 중...
    cd backend
    call npm install
    cd ..
)

if not exist "front\node_modules\" (
    echo [3/3] Frontend 의존성 설치 중...
    cd front
    call npm install
    cd ..
)

echo.
echo ========================================
echo  서버 시작 중...
echo  - Frontend: http://localhost:5173
echo  - Backend Node.js: http://localhost:3000
echo  - Backend Python: http://localhost:8000
echo ========================================
echo.

npm start
