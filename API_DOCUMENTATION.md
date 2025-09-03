# REST API Documentation для управления пользователями и ролями

## Обзор

Данный API предоставляет интерфейс для управления пользователями, ролями и балансами в системе LibreChat. Все эндпоинты требуют аутентификации и соответствующих разрешений.

## Аутентификация

Все запросы должны содержать JWT токен в заголовке:
```
Authorization: Bearer <your-jwt-token>
```

## Базовый URL

```
http://localhost:3080/api/admin
```

## Управление пользователями

### Получить список пользователей

**GET** `/users`

Возвращает список всех пользователей с их балансами.

**Ответ:**
```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "username",
      "name": "User Name",
      "role": "USER",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "balance": 1000
    }
  ],
  "total": 1
}
```

### Установить баланс пользователя

**PUT** `/users/:userId/balance`

Устанавливает точное значение баланса пользователя.

**Параметры тела:**
```json
{
  "balance": 1000,
  "reason": "Initial balance setup"
}
```

**Ответ:**
```json
{
  "message": "Balance updated successfully",
  "userId": "507f1f77bcf86cd799439011",
  "oldBalance": 500,
  "newBalance": 1000,
  "change": 500
}
```

### Изменить баланс пользователя

**PATCH** `/users/:userId/balance`

Добавляет или отнимает указанное количество токенов с баланса пользователя.

**Параметры тела:**
```json
{
  "amount": 100,
  "reason": "Bonus for good behavior"
}
```

**Ответ:**
```json
{
  "message": "Balance adjusted successfully",
  "userId": "507f1f77bcf86cd799439011",
  "oldBalance": 1000,
  "newBalance": 1100,
  "change": 100
}
```

### Изменить роль пользователя

**PUT** `/users/:userId/role`

Назначает пользователю новую роль.

**Параметры тела:**
```json
{
  "role": "PRO"
}
```

**Ответ:**
```json
{
  "message": "User role updated successfully",
  "userId": "507f1f77bcf86cd799439011",
  "oldRole": "USER",
  "newRole": "PRO"
}
```

### Получить доступные модели пользователя

**GET** `/users/:userId/models`

Возвращает список моделей, доступных пользователю с их коэффициентами.

**Ответ:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "availableModels": [
    {
      "name": "gpt-4-turbo",
      "coefficient": 1.5
    },
    {
      "name": "claude-3-opus",
      "coefficient": 1.8
    }
  ],
  "total": 2
}
```

## Управление ролями

### Получить список ролей

**GET** `/roles`

Возвращает список всех ролей с их настройками.

**Ответ:**
```json
{
  "roles": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "PRO",
      "permissions": {
        "PROMPTS": {
          "USE": true,
          "CREATE": true
        },
        "ROLE_MANAGEMENT": {
          "CREATE": false,
          "UPDATE": false,
          "DELETE": false
        }
      },
      "modelAccess": {
        "gpt-4-turbo": {
          "enabled": true,
          "coefficient": 1.5
        },
        "claude-3-opus": {
          "enabled": true,
          "coefficient": 1.8
        }
      }
    }
  ],
  "total": 1
}
```

### Создать новую роль

**POST** `/roles`

Создает новую роль с указанными настройками.

**Параметры тела:**
```json
{
  "name": "PREMIUM",
  "permissions": {
    "PROMPTS": {
      "USE": true,
      "CREATE": true
    },
    "ROLE_MANAGEMENT": {
      "CREATE": false,
      "UPDATE": false,
      "DELETE": false
    },
    "BALANCE_MANAGEMENT": {
      "UPDATE": false
    }
  },
  "modelAccess": {
    "gpt-4-turbo": {
      "enabled": true,
      "coefficient": 1.2
    },
    "claude-3-opus": {
      "enabled": true,
      "coefficient": 1.5
    },
    "gpt-3.5-turbo": {
      "enabled": true,
      "coefficient": 1.0
    }
  }
}
```

**Ответ:**
```json
{
  "message": "Role created successfully",
  "role": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "PREMIUM",
    "permissions": { ... },
    "modelAccess": { ... }
  }
}
```

### Обновить роль

**PUT** `/roles/:roleName`

Обновляет существующую роль.

**Параметры тела:**
```json
{
  "permissions": {
    "PROMPTS": {
      "USE": true,
      "CREATE": true
    }
  },
  "modelAccess": {
    "gpt-4-turbo": {
      "enabled": true,
      "coefficient": 1.3
    }
  }
}
```

**Ответ:**
```json
{
  "message": "Role updated successfully",
  "role": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "PREMIUM",
    "permissions": { ... },
    "modelAccess": { ... }
  }
}
```

### Удалить роль

**DELETE** `/roles/:roleName`

Удаляет роль (только если она не используется пользователями).

**Ответ:**
```json
{
  "message": "Role deleted successfully",
  "roleName": "PREMIUM"
}
```

## Коды ошибок

### 400 Bad Request
- Неверные параметры запроса
- Ошибки валидации данных

### 403 Forbidden
- Недостаточно прав для выполнения операции

### 404 Not Found
- Пользователь или роль не найдены

### 500 Internal Server Error
- Внутренняя ошибка сервера

## Примеры использования

### Создание роли "Pro" с доступом к GPT-4

```bash
curl -X POST http://localhost:3080/api/admin/roles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PRO",
    "permissions": {
      "PROMPTS": {
        "USE": true,
        "CREATE": true
      },
      "ROLE_MANAGEMENT": {
        "CREATE": false,
        "UPDATE": false,
        "DELETE": false
      },
      "BALANCE_MANAGEMENT": {
        "UPDATE": false
      }
    },
    "modelAccess": {
      "gpt-4-turbo": {
        "enabled": true,
        "coefficient": 1.5
      },
      "claude-3-opus": {
        "enabled": true,
        "coefficient": 1.8
      }
    }
  }'
```

### Назначение роли пользователю

```bash
curl -X PUT http://localhost:3080/api/admin/users/USER_ID/role \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "PRO"
  }'
```

### Установка баланса пользователя

```bash
curl -X PUT http://localhost:3080/api/admin/users/USER_ID/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "balance": 1000,
    "reason": "Welcome bonus"
  }'
```

## Система разрешений

### ROLE_MANAGEMENT
- `CREATE` - Создание новых ролей
- `UPDATE` - Редактирование существующих ролей
- `DELETE` - Удаление ролей

### BALANCE_MANAGEMENT
- `UPDATE` - Изменение балансов пользователей

### Модели и коэффициенты

Каждая роль может иметь настройки доступа к моделям:
- `enabled` - Доступ к модели разрешен/запрещен
- `coefficient` - Множитель стоимости токенов (0.1 - 10.0)

Формула расчета стоимости:
```
Стоимость = Базовые_токены × Коэффициент_модели
```

## Безопасность

1. Все эндпоинты требуют JWT аутентификации
2. Проверка разрешений на уровне ролей
3. Валидация входных данных
4. Логирование всех административных операций
5. Защита от SQL-инъекций

