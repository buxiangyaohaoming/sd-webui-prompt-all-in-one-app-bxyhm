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
    echo [ERROR] Python not found, please run AAA启动工具.bat first
    pause
    exit /b 1
)

SET PATH=%PYTHONPATH%;%PYTHONPATH%Scripts;%PATH%
SET USERPROFILE=%PYTHONPATH%home
SET HOME=%PYTHONPATH%home
SET PYTHONUSERBASE=%PYTHONPATH%home\.local

if not exist "%HOME%" mkdir "%PYTHON_DIR%home"

SET BASE_PATH_NO_SLASH=%BASE_PATH:~0,-1%
(
    echo python310.zip
    echo .
    echo %BASE_PATH_NO_SLASH%
    echo Lib/site-packages
    echo import site
) > "%PYTHONPATH%python310._pth"

echo import sys;import os;sys.path.insert(0,os.path.dirname(sys.argv[0])) > "%PYTHONPATH%Lib\site-packages\start_path.pth"

echo Starting application...
echo Open: http://localhost:17860
"%PYTHONPATH%python.exe" app.py
pause
