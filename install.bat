@echo off
echo ========================================
echo  MIRAEDOJEON 프로젝트 의존성 설치
echo ========================================
echo.

echo [1/3] 루트 의존성 설치 중...
call npm install

echo.
echo [2/3] Backend 의존성 설치 중...
cd backend
call npm install
cd ..

echo.
echo [3/3] Frontend 의존성 설치 중...
cd front
call npm install
cd ..

echo.
echo ========================================
echo  설치 완료!
echo  'start.bat' 또는 'npm start'로 실행하세요.
echo ========================================
pause
