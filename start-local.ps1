# Скрипт для запуска MetoGPT проекта локально (без Docker)

Write-Host "🚀 Запуск MetoGPT проекта локально..." -ForegroundColor Green

# 1. Проверяем, что MongoDB запущен локально
Write-Host "🗄️ Проверяем MongoDB..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:27017" -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ MongoDB доступен" -ForegroundColor Green
} catch {
    Write-Host "❌ MongoDB не доступен. Запускаем локальный MongoDB..." -ForegroundColor Yellow
    
    # Пытаемся запустить MongoDB через Docker
    try {
        docker run -d --name mongodb-local -p 27017:27017 mongo
        Write-Host "✅ MongoDB запущен через Docker" -ForegroundColor Green
        Start-Sleep -Seconds 3
    } catch {
        Write-Host "❌ Не удалось запустить MongoDB. Установите MongoDB локально или запустите Docker Desktop." -ForegroundColor Red
        exit 1
    }
}

# 2. Запускаем миграцию ролей
Write-Host "🔄 Запускаем миграцию ролей..." -ForegroundColor Yellow
$env:MONGODB_URI="mongodb://localhost:27017/LibreChat"
npm run migrate:roles:simple

# 3. Запускаем тестовый сервер с нашим API
Write-Host "🎯 Запускаем тестовый сервер с Admin API..." -ForegroundColor Yellow
$env:MONGODB_URI="mongodb://localhost:27017/LibreChat"
node test-server.js

Write-Host "✅ Проект запущен!" -ForegroundColor Green
Write-Host "🌐 Тестовый сервер: http://localhost:3080" -ForegroundColor Cyan
Write-Host "🔧 Admin API: http://localhost:3080/api/admin" -ForegroundColor Cyan
Write-Host "💚 Health check: http://localhost:3080/health" -ForegroundColor Cyan

