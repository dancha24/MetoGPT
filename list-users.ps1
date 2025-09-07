# Скрипт для получения списка пользователей
param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users" -Method GET -Headers $headers
    
    Write-Host "👥 Список пользователей:" -ForegroundColor Green
    Write-Host "Всего пользователей: $($response.total)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($user in $response.users) {
        Write-Host "ID: $($user._id)" -ForegroundColor Yellow
        Write-Host "Имя: $($user.name)" -ForegroundColor White
        Write-Host "Email: $($user.email)" -ForegroundColor Gray
        Write-Host "Роль: $($user.role)" -ForegroundColor Magenta
        Write-Host "Баланс: $($user.balance)" -ForegroundColor Green
        Write-Host "Создан: $($user.createdAt)" -ForegroundColor DarkGray
        Write-Host "----------------------------------------" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "❌ Ошибка при получении списка пользователей:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Пример использования:
# .\list-users.ps1 -Token "YOUR_JWT_TOKEN_HERE"
