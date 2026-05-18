@echo off
title Restauracja Seahorse - Uruchamianie Systemu
color 0B

echo ===================================================
echo     SYSTEM REZERWACJI - RESTAURACJA SEAHORSE
echo ===================================================
echo.
echo Trwa uruchamianie systemu przez Docker...
echo Prosze czekac. Nie zamykaj tego okna!
echo.

docker-compose up --build

echo.
echo ===================================================
echo  System zostal zatrzymany. Wcisnij dowolny klawisz.
echo ===================================================
pause >nul
