@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
set PYTHON=C:\Users\zinbe\AppData\Local\Programs\Python\Python312\python.exe
cd /d "%~dp0"
npm run rebuild
