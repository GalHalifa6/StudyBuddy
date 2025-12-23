# Restart Backend Script
# This script stops any running Spring Boot instance and starts a fresh one

Write-Host "Stopping any existing Spring Boot processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*java*" -and $_.CommandLine -like "*studybuddy*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "Setting JAVA_HOME..." -ForegroundColor Yellow
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

Write-Host "Compiling and starting backend..." -ForegroundColor Green
cd C:\Users\asher\OneDrive\Desktop\studybuddy-backend
mvn clean compile spring-boot:run



