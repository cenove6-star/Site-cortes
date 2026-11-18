@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python nao encontrado. Instale em python.org e marque "Add Python to PATH".
  pause
  exit /b
)
echo Atualizando o baixador de videos...
python -m pip install -q -U yt-dlp imageio-ffmpeg
python servidor.py
pause
