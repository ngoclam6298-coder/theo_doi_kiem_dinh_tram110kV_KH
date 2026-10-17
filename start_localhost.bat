@echo off
chcp 65001 > nul
echo =======================================================
echo   HE THONG THEO DOI HAN KIEM DINH THIET BI DO DEM 110kV
echo   Dang khoi dong Web App tai: http://localhost:8080
echo =======================================================
start http://localhost:8080
"C:\Users\EVNHCMCPCPT\AppData\Local\Python\bin\python.exe" server.py
pause
