@ECHO OFF
chcp 65001 > nul
TITLE sd-webui-prompt-all-in-one

SET PYTHON_VER=3.10.11
SET PYTHON_DIR=python-%PYTHON_VER%-embed-amd64

cd /d %~dp0
SET BASE_PATH=%~dp0

REM Python 可能在本目录（发布包）或上级目录（git clone 后手动放置）
if exist "%BASE_PATH%%PYTHON_DIR%\python.exe" (
    SET PYTHONPATH=%BASE_PATH%%PYTHON_DIR%\
) else if exist "%BASE_PATH%..\%PYTHON_DIR%\python.exe" (
    SET PYTHONPATH=%BASE_PATH%..\%PYTHON_DIR%\
) else (
    echo ============================================================
    echo [ERROR] Python %PYTHON_VER% 未找到
    echo ============================================================
    echo.
    echo 请下载嵌入版 Python 并解压到以下任一位置：
    echo   1. %BASE_PATH%%PYTHON_DIR%\
    echo   2. %BASE_PATH%..\%PYTHON_DIR%\
    echo.
    echo 下载地址：
    echo https://www.python.org/ftp/python/%PYTHON_VER%/python-%PYTHON_VER%-embed-amd64.zip
    echo.
    echo 如果您已有系统 Python，可直接运行：
    echo   pip install -r requirements.txt
    echo   python app.py
    echo ============================================================
    pause
    exit /b 1
)

SET PATH=%PYTHONPATH%;%PYTHONPATH%Scripts;%PATH%
SET USERPROFILE=%PYTHONPATH%home
SET HOME=%PYTHONPATH%home
SET PYTHONUSERBASE=%PYTHONPATH%home\.local

echo ============================================================
echo   sd-webui-prompt-all-in-one
echo ============================================================
echo.

echo [1/5] Checking environment...
echo [OK] Python found: %PYTHONPATH%python.exe

if not exist "%HOME%" mkdir "%PYTHON_DIR%home"
if not exist "%HOME%" (
    echo [ERROR] Cannot create home directory
    pause
    exit /b 1
)

echo [2/5] Configuring Python paths...
REM 去掉 BASE_PATH 末尾反斜杠用于 pth 文件
SET BASE_PATH_NO_SLASH=%BASE_PATH:~0,-1%
(
    echo python310.zip
    echo .
    echo %BASE_PATH_NO_SLASH%
    echo Lib/site-packages
    echo import site
) > "%PYTHONPATH%python310._pth"

echo import sys;import os;sys.path.insert(0,os.path.dirname(sys.argv[0])) > "%PYTHONPATH%Lib\site-packages\start_path.pth"

echo [3/5] Python and pip version:
"%PYTHONPATH%python.exe" -V
"%PYTHONPATH%python.exe" -m pip -V

echo [4/5] Installing dependencies...
"%PYTHONPATH%python.exe" -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [WARNING] Some dependencies failed to install, trying to continue...
) else (
    echo [OK] Dependencies installed
)

echo [5/5] Starting application...
echo.
echo Application started at: http://localhost:17860
echo Press Ctrl+C to stop
echo ============================================================
echo.
"%PYTHONPATH%python.exe" app.py
pause
