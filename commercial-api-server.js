#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Подключение к MongoDB
async function connectDb() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/LibreChat';
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Схема роли
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  permissions: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map(),
  },
  modelAccess: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map(),
  },
});

const Role = mongoose.model('Role', roleSchema);

// Схема пользователя
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, required: true, default: 'USER' },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Простая аутентификация (для тестирования)
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-id', role: 'ADMIN' };
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Commercial API server is running',
    timestamp: new Date().toISOString()
  });
});

// Главная страница API
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MetoGPT Commercial API</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .method { font-weight: bold; color: #007bff; }
        .url { font-family: monospace; background: #e9ecef; padding: 2px 5px; border-radius: 3px; }
        h1 { color: #333; text-align: center; }
        h2 { color: #666; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .status { padding: 10px; border-radius: 5px; margin: 15px 0; font-weight: bold; }
        .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }
        .button:hover { background: #0056b3; }
        .result { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; margin-top: 15px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 MetoGPT Commercial API</h1>
        <p>Этот сервер предоставляет API для управления коммерческими функциями LibreChat.</p>
        
        <div class="status success">
            ✅ LibreChat работает на <a href="http://localhost:3080" target="_blank">http://localhost:3080</a>
        </div>
        
        <h2>📊 Статус сервера</h2>
        <button class="button" onclick="checkHealth()">Проверить статус</button>
        <div id="healthResult" class="result" style="display: none;"></div>
        
        <h2>🔐 API Endpoints</h2>
        
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
        <p><strong>LibreChat:</strong> <a href="http://localhost:3080" target="_blank">http://localhost:3080</a></p>
        <p><strong>Commercial API:</strong> <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></p>
    </div>

    <script>
        async function checkHealth() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                const result = document.getElementById('healthResult');
                result.style.display = 'block';
                result.textContent = JSON.stringify(data, null, 2);
                result.className = 'result';
            } catch (error) {
                const result = document.getElementById('healthResult');
                result.style.display = 'block';
                result.textContent = 'Error: ' + error.message;
                result.className = 'result';
            }
        }
    </script>
</body>
</html>
  `);
});

// GET /api/admin/users
app.get('/api/admin/users', mockAuth, async (req, res) => {
  try {
    const users = await User.find({});
    res.json({
      users,
      total: users.length,
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
    const roles = await Role.find({});
    res.json({
      roles,
      total: roles.length,
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
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ 
        error: 'Role already exists',
        message: 'Role with this name already exists' 
      });
    }

    const newRole = new Role({
      name: name.toUpperCase(),
      permissions: permissions || {},
      modelAccess: modelAccess || {},
    });

    await newRole.save();

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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User with specified ID does not exist' 
      });
    }

    const oldBalance = user.balance;
    user.balance = balance;
    await user.save();

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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User with specified ID does not exist' 
      });
    }

    const roleExists = await Role.findOne({ name: role });
    if (!roleExists) {
      return res.status(400).json({ 
        error: 'Role not found',
        message: 'Specified role does not exist' 
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User with specified ID does not exist' 
      });
    }

    const userRole = await Role.findOne({ name: user.role });
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

// Запуск сервера
async function startServer() {
  try {
    await connectDb();
    
    app.listen(PORT, () => {
      console.log(`🚀 Commercial API server running on http://localhost:${PORT}`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Admin API: http://localhost:${PORT}/api/admin`);
      console.log(`📊 Users: http://localhost:${PORT}/api/admin/users`);
      console.log(`👥 Roles: http://localhost:${PORT}/api/admin/roles`);
      console.log(`\n🎯 Теперь у вас есть:`);
      console.log(`   • LibreChat на порту 3080`);
      console.log(`   • Commercial API на порту 3000`);
      console.log(`   • MongoDB на порту 27017`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
