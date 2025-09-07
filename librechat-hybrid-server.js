#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3080;

app.use(cors());
app.use(express.json());

// Простая аутентификация (для тестирования)
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-id' };
  next();
};

// Тестовые данные в памяти
const mockUsers = [
  {
    _id: '68b786243650bd18a0ebfe45',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    role: 'USER',
    balance: 2000,
    createdAt: '2025-09-03T00:04:52.000Z'
  },
  {
    _id: '68b786243650bd18a0ebfe46',
    email: 'admin@example.com',
    username: 'admin',
    name: 'Admin User',
    role: 'ADMIN',
    balance: 5000,
    createdAt: '2025-09-03T00:04:52.000Z'
  }
];

const mockRoles = [
  {
    _id: '68b785727aa8fef3c4097732',
    name: 'ADMIN',
    permissions: {
      ROLE_MANAGEMENT: {
        CREATE: true,
        UPDATE: true,
        DELETE: true
      },
      BALANCE_MANAGEMENT: {
        UPDATE: true
      }
    },
    modelAccess: {
      'gpt-4': { enabled: true, coefficient: 1.5 },
      'claude-3': { enabled: true, coefficient: 1.8 },
      'gpt-3.5-turbo': { enabled: true, coefficient: 1.0 }
    }
  },
  {
    _id: '68b785727aa8fef3c4097736',
    name: 'USER',
    permissions: {
      ROLE_MANAGEMENT: {
        CREATE: false,
        UPDATE: false,
        DELETE: false
      },
      BALANCE_MANAGEMENT: {
        UPDATE: false
      }
    },
    modelAccess: {
      'gpt-3.5-turbo': { enabled: true, coefficient: 1.0 }
    }
  }
];

// Статические файлы для LibreChat (если есть)
app.use(express.static(path.join(__dirname, 'client/dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'LibreChat Hybrid server is running',
    timestamp: new Date().toISOString()
  });
});

// Главная страница LibreChat (если есть) или наша демо-страница
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MetoGPT - LibreChat с коммерческими функциями</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }

        .content {
            padding: 30px;
        }

        .section {
            margin-bottom: 40px;
            padding: 25px;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            background: #fafafa;
        }

        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5em;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }

        .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
            transition: transform 0.2s;
        }

        .button:hover {
            transform: translateY(-2px);
        }

        .button.secondary {
            background: #6c757d;
        }

        .button.danger {
            background: #dc3545;
        }

        .input-group {
            margin-bottom: 15px;
        }

        .input-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }

        .input-group input, .input-group select, .input-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }

        .input-group textarea {
            height: 100px;
            resize: vertical;
        }

        .result {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin-top: 15px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
            white-space: pre-wrap;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .status {
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-weight: bold;
        }

        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }

        .chat-section {
            background: #f8f9fa;
            border: 2px solid #667eea;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .chat-messages {
            height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            background: white;
            margin-bottom: 10px;
        }

        .message {
            margin-bottom: 10px;
            padding: 8px 12px;
            border-radius: 8px;
        }

        .message.user {
            background: #e3f2fd;
            margin-left: 20%;
        }

        .message.bot {
            background: #f3e5f5;
            margin-right: 20%;
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 MetoGPT - LibreChat</h1>
            <p>AI чат с коммерческими функциями</p>
        </div>

        <div class="content">
            <!-- Чат секция -->
            <div class="chat-section">
                <h2>💬 AI Чат</h2>
                <div class="chat-messages" id="chatMessages">
                    <div class="message bot">
                        <strong>AI:</strong> Привет! Я MetoGPT - AI ассистент с коммерческими функциями. Как я могу вам помочь?
                    </div>
                </div>
                <div class="input-group">
                    <input type="text" id="messageInput" placeholder="Введите ваше сообщение..." onkeypress="handleKeyPress(event)">
                    <button class="button" onclick="sendMessage()">Отправить</button>
                </div>
            </div>

            <!-- Статус сервера -->
            <div class="section">
                <h2>📊 Статус сервера</h2>
                <button class="button" onclick="checkHealth()">Проверить статус</button>
                <div id="healthResult" class="result" style="display: none;"></div>
            </div>

            <!-- Управление пользователями -->
            <div class="section">
                <h2>👥 Управление пользователями</h2>
                <button class="button" onclick="getUsers()">Получить список пользователей</button>
                <div id="usersResult" class="result" style="display: none;"></div>
            </div>

            <!-- Управление ролями -->
            <div class="section">
                <h2>🔐 Управление ролями</h2>
                <div class="grid">
                    <div>
                        <button class="button" onclick="getRoles()">Получить список ролей</button>
                        <div id="rolesResult" class="result" style="display: none;"></div>
                    </div>
                    <div>
                        <h3>Создать новую роль</h3>
                        <div class="input-group">
                            <label>Название роли:</label>
                            <input type="text" id="roleName" placeholder="PRO">
                        </div>
                        <div class="input-group">
                            <label>Разрешения (JSON):</label>
                            <textarea id="rolePermissions" placeholder='{"ROLE_MANAGEMENT": {"CREATE": false, "UPDATE": false, "DELETE": false}, "BALANCE_MANAGEMENT": {"UPDATE": false}}'>{"ROLE_MANAGEMENT": {"CREATE": false, "UPDATE": false, "DELETE": false}, "BALANCE_MANAGEMENT": {"UPDATE": false}}</textarea>
                        </div>
                        <div class="input-group">
                            <label>Доступ к моделям (JSON):</label>
                            <textarea id="roleModelAccess" placeholder='{"gpt-4": {"enabled": true, "coefficient": 1.5}}'>{"gpt-4": {"enabled": true, "coefficient": 1.5}}</textarea>
                        </div>
                        <button class="button" onclick="createRole()">Создать роль</button>
                        <div id="createRoleResult" class="result" style="display: none;"></div>
                    </div>
                </div>
            </div>

            <!-- Управление балансом -->
            <div class="section">
                <h2>💰 Управление балансом</h2>
                <div class="grid">
                    <div>
                        <h3>Обновить баланс пользователя</h3>
                        <div class="input-group">
                            <label>ID пользователя:</label>
                            <input type="text" id="userId" placeholder="68b786243650bd18a0ebfe45">
                        </div>
                        <div class="input-group">
                            <label>Новый баланс:</label>
                            <input type="number" id="newBalance" placeholder="3000">
                        </div>
                        <div class="input-group">
                            <label>Причина:</label>
                            <input type="text" id="balanceReason" placeholder="Пополнение баланса">
                        </div>
                        <button class="button" onclick="updateBalance()">Обновить баланс</button>
                        <div id="balanceResult" class="result" style="display: none;"></div>
                    </div>
                    <div>
                        <h3>Изменить роль пользователя</h3>
                        <div class="input-group">
                            <label>ID пользователя:</label>
                            <input type="text" id="changeRoleUserId" placeholder="68b786243650bd18a0ebfe45">
                        </div>
                        <div class="input-group">
                            <label>Новая роль:</label>
                            <select id="newRole">
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="TEST">TEST</option>
                            </select>
                        </div>
                        <button class="button" onclick="changeUserRole()">Изменить роль</button>
                        <div id="changeRoleResult" class="result" style="display: none;"></div>
                    </div>
                </div>
            </div>

            <!-- Доступ к моделям -->
            <div class="section">
                <h2>🤖 Доступ к моделям</h2>
                <div class="input-group">
                    <label>ID пользователя:</label>
                    <input type="text" id="modelsUserId" placeholder="68b786243650bd18a0ebfe45">
                </div>
                <button class="button" onclick="getUserModels()">Получить доступные модели</button>
                <div id="modelsResult" class="result" style="display: none;"></div>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = 'http://localhost:3080/api/admin';

        async function makeRequest(url, options = {}) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                });
                
                const data = await response.json();
                return { success: response.ok, data, status: response.status };
            } catch (error) {
                return { success: false, data: { error: error.message }, status: 0 };
            }
        }

        function showResult(elementId, result) {
            const element = document.getElementById(elementId);
            element.style.display = 'block';
            element.textContent = JSON.stringify(result, null, 2);
            element.className = 'result ' + (result.success ? 'success' : 'error');
        }

        // Чат функции
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;

            const chatMessages = document.getElementById('chatMessages');
            
            // Добавляем сообщение пользователя
            const userMessage = document.createElement('div');
            userMessage.className = 'message user';
            userMessage.innerHTML = '<strong>Вы:</strong> ' + message;
            chatMessages.appendChild(userMessage);

            // Очищаем поле ввода
            input.value = '';

            // Имитируем ответ AI
            setTimeout(() => {
                const botMessage = document.createElement('div');
                botMessage.className = 'message bot';
                botMessage.innerHTML = '<strong>AI:</strong> Спасибо за ваше сообщение! Это демо-версия MetoGPT с коммерческими функциями. В реальной версии здесь был бы ответ от AI модели.';
                chatMessages.appendChild(botMessage);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);

            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // API функции
        async function checkHealth() {
            const result = await makeRequest('http://localhost:3080/health');
            showResult('healthResult', result);
        }

        async function getUsers() {
            const result = await makeRequest(\`\${API_BASE}/users\`);
            showResult('usersResult', result);
        }

        async function getRoles() {
            const result = await makeRequest(\`\${API_BASE}/roles\`);
            showResult('rolesResult', result);
        }

        async function createRole() {
            const name = document.getElementById('roleName').value;
            const permissions = JSON.parse(document.getElementById('rolePermissions').value);
            const modelAccess = JSON.parse(document.getElementById('roleModelAccess').value);

            const result = await makeRequest(\`\${API_BASE}/roles\`, {
                method: 'POST',
                body: JSON.stringify({ name, permissions, modelAccess })
            });
            showResult('createRoleResult', result);
        }

        async function updateBalance() {
            const userId = document.getElementById('userId').value;
            const balance = parseInt(document.getElementById('newBalance').value);
            const reason = document.getElementById('balanceReason').value;

            const result = await makeRequest(\`\${API_BASE}/users/\${userId}/balance\`, {
                method: 'PUT',
                body: JSON.stringify({ balance, reason })
            });
            showResult('balanceResult', result);
        }

        async function changeUserRole() {
            const userId = document.getElementById('changeRoleUserId').value;
            const role = document.getElementById('newRole').value;

            const result = await makeRequest(\`\${API_BASE}/users/\${userId}/role\`, {
                method: 'PUT',
                body: JSON.stringify({ role })
            });
            showResult('changeRoleResult', result);
        }

        async function getUserModels() {
            const userId = document.getElementById('modelsUserId').value;

            const result = await makeRequest(\`\${API_BASE}/users/\${userId}/models\`);
            showResult('modelsResult', result);
        }

        // Автоматически проверяем статус при загрузке
        window.onload = function() {
            checkHealth();
        };
    </script>
</body>
</html>
  `);
});

// API Admin страница
app.get('/api/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MetoGPT Admin API</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { font-weight: bold; color: #007bff; }
        .url { font-family: monospace; background: #e9ecef; padding: 2px 5px; }
        h1 { color: #333; }
        h2 { color: #666; }
    </style>
</head>
<body>
    <h1>🚀 MetoGPT Admin API</h1>
    <p>Доступные эндпоинты:</p>
    
    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/admin/users</span>
        <p>Получить список всех пользователей</p>
    </div>
    
    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/admin/roles</span>
        <p>Получить список всех ролей</p>
    </div>
    
    <div class="endpoint">
        <span class="method">POST</span> <span class="url">/api/admin/roles</span>
        <p>Создать новую роль</p>
    </div>
    
    <div class="endpoint">
        <span class="method">PUT</span> <span class="url">/api/admin/users/:userId/balance</span>
        <p>Обновить баланс пользователя</p>
    </div>
    
    <div class="endpoint">
        <span class="method">PUT</span> <span class="url">/api/admin/users/:userId/role</span>
        <p>Изменить роль пользователя</p>
    </div>
    
    <div class="endpoint">
        <span class="method">GET</span> <span class="url">/api/admin/users/:userId/models</span>
        <p>Получить доступные модели для пользователя</p>
    </div>
    
    <hr>
    <p><a href="/">← Вернуться к главной странице</a></p>
</body>
</html>
  `);
});

// GET /api/admin/users
app.get('/api/admin/users', mockAuth, async (req, res) => {
  try {
    res.json({
      users: mockUsers,
      total: mockUsers.length,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

// GET /api/admin/roles
app.get('/api/admin/roles', mockAuth, async (req, res) => {
  try {
    res.json({
      roles: mockRoles,
      total: mockRoles.length,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch roles',
      message: error.message 
    });
  }
});

// POST /api/admin/roles
app.post('/api/admin/roles', mockAuth, async (req, res) => {
  try {
    const { name, permissions, modelAccess } = req.body;

    // Проверяем, что роль с таким именем не существует
    const existingRole = mockRoles.find(role => role.name === name);
    if (existingRole) {
      return res.status(400).json({ 
        error: 'Role already exists',
        message: 'Role with this name already exists' 
      });
    }

    const newRole = {
      _id: Date.now().toString(),
      name: name.toUpperCase(),
      permissions: permissions || {},
      modelAccess: modelAccess || {},
    };

    mockRoles.push(newRole);

    res.status(201).json({
      message: 'Role created successfully',
      role: newRole,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create role',
      message: error.message 
    });
  }
});

// PUT /api/admin/users/:userId/balance
app.put('/api/admin/users/:userId/balance', mockAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { balance, reason } = req.body;

    const user = mockUsers.find(u => u._id === userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User with specified ID does not exist' 
      });
    }

    const oldBalance = user.balance;
    user.balance = balance;

    res.json({
      message: 'Balance updated successfully',
      userId,
      oldBalance,
      newBalance: balance,
      change: balance - oldBalance,
      reason: reason || 'Manual update'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update balance',
      message: error.message 
    });
  }
});

// PUT /api/admin/users/:userId/role
app.put('/api/admin/users/:userId/role', mockAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = mockUsers.find(u => u._id === userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User with specified ID does not exist' 
      });
    }

    const roleExists = mockRoles.find(r => r.name === role);
    if (!roleExists) {
      return res.status(400).json({ 
        error: 'Role not found',
        message: 'Specified role does not exist' 
      });
    }

    const oldRole = user.role;
    user.role = role;

    res.json({
      message: 'User role updated successfully',
      userId,
      oldRole,
      newRole: role,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update user role',
      message: error.message 
    });
  }
});

// GET /api/admin/users/:userId/models
app.get('/api/admin/users/:userId/models', mockAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = mockUsers.find(u => u._id === userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User with specified ID does not exist' 
      });
    }

    const userRole = mockRoles.find(r => r.name === user.role);
    if (!userRole) {
      return res.status(404).json({ 
        error: 'Role not found',
        message: 'User role does not exist' 
      });
    }

    res.json({
      userId,
      userRole: userRole.name,
      availableModels: userRole.modelAccess,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch user models',
      message: error.message 
    });
  }
});

// DELETE /api/admin/roles/:roleName
app.delete('/api/admin/roles/:roleName', mockAuth, async (req, res) => {
  try {
    const { roleName } = req.params;

    const roleIndex = mockRoles.findIndex(r => r.name === roleName);
    if (roleIndex === -1) {
      return res.status(404).json({ 
        error: 'Role not found',
        message: 'Role with specified name does not exist' 
      });
    }

    // Проверяем, что роль не используется пользователями
    const usersWithRole = mockUsers.filter(u => u.role === roleName);
    if (usersWithRole.length > 0) {
      return res.status(400).json({ 
        error: 'Role in use',
        message: 'Cannot delete role that is assigned to users' 
      });
    }

    const deletedRole = mockRoles.splice(roleIndex, 1)[0];

    res.json({
      message: 'Role deleted successfully',
      deletedRole,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to delete role',
      message: error.message 
    });
  }
});

// PUT /api/admin/roles/:roleName
app.put('/api/admin/roles/:roleName', mockAuth, async (req, res) => {
  try {
    const { roleName } = req.params;
    const { permissions, modelAccess } = req.body;

    const role = mockRoles.find(r => r.name === roleName);
    if (!role) {
      return res.status(404).json({ 
        error: 'Role not found',
        message: 'Role with specified name does not exist' 
      });
    }

    if (permissions) {
      role.permissions = { ...role.permissions, ...permissions };
    }

    if (modelAccess) {
      role.modelAccess = { ...role.modelAccess, ...modelAccess };
    }

    res.json({
      message: 'Role updated successfully',
      role,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update role',
      message: error.message 
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 LibreChat Hybrid server running on http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Admin API: http://localhost:${PORT}/api/admin`);
  console.log(`📊 Users: http://localhost:${PORT}/api/admin/users`);
  console.log(`👥 Roles: http://localhost:${PORT}/api/admin/roles`);
  console.log(`\n🎯 Готово! Теперь у вас есть чат + коммерческие функции!`);
});
