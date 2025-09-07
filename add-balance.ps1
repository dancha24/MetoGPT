# Скрипт для начисления баланса пользователю
param(
    [Parameter(Mandatory=$true)]
    [string]$UserId,
    
    [Parameter(Mandatory=$true)]
    [int]$Amount,
    
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [string]$Reason = "Начисление баланса"
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{
    balance = $Amount
    reason = $Reason
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users/$UserId/balance" -Method PUT -Headers $headers -Body $body
    
    Write-Host "✅ Баланс успешно обновлен!" -ForegroundColor Green
    Write-Host "Пользователь ID: $($response.userId)" -ForegroundColor Cyan
    Write-Host "Старый баланс: $($response.oldBalance)" -ForegroundColor Yellow
    Write-Host "Новый баланс: $($response.newBalance)" -ForegroundColor Green
    Write-Host "Изменение: $($response.change)" -ForegroundColor Magenta
    Write-Host "Причина: $($response.reason)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Ошибка при обновлении баланса:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Пример использования:
# .\add-balance.ps1 -UserId "USER_ID_HERE" -Amount 1000 -Token "YOUR_JWT_TOKEN_HERE"
