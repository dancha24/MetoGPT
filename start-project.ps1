# Скрипт для запуска MetoGPT проекта

Write-Host "🚀 Запуск MetoGPT проекта..." -ForegroundColor Green

# 1. Проверяем, что Docker Desktop запущен
Write-Host "📦 Проверяем Docker Desktop..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✅ Docker Desktop запущен" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop не запущен. Запустите Docker Desktop и попробуйте снова." -ForegroundColor Red
    exit 1
}

# 2. Останавливаем все контейнеры
Write-Host "🛑 Останавливаем существующие контейнеры..." -ForegroundColor Yellow
docker-compose down

# 3. Запускаем MongoDB
Write-Host "🗄️ Запускаем MongoDB..." -ForegroundColor Yellow
docker-compose up -d mongodb

# 4. Ждем, пока MongoDB запустится
Write-Host "⏳ Ждем запуска MongoDB..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 5. Запускаем миграцию ролей
Write-Host "🔄 Запускаем миграцию ролей..." -ForegroundColor Yellow
$env:MONGODB_URI="mongodb://localhost:27017/LibreChat"
npm run migrate:roles:simple

# 6. Запускаем основной проект
Write-Host "🎯 Запускаем LibreChat..." -ForegroundColor Yellow
$env:MONGODB_URI="mongodb://localhost:27017/LibreChat"
npm run backend:dev

Write-Host "✅ Проект запущен!" -ForegroundColor Green
Write-Host "🌐 LibreChat: http://localhost:3080" -ForegroundColor Cyan
Write-Host "🔧 Admin API: http://localhost:3080/api/admin" -ForegroundColor Cyan

