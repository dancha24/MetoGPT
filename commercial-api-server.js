#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = 3000;

// JWT секрет (в продакшене должен быть в .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

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

// Схема пользователя LibreChat
const userSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String, lowercase: true, default: '' },
  email: { type: String, required: true, lowercase: true, unique: true },
  emailVerified: { type: Boolean, required: true, default: false },
  password: { type: String, select: false },
  avatar: { type: String },
  provider: { type: String, required: true, default: 'local' },
  role: { type: String, default: 'USER' },
  plugins: { type: Array },
  twoFactorEnabled: { type: Boolean, default: false },
  termsAccepted: { type: Boolean, default: false },
  personalization: {
    type: {
      memories: { type: Boolean, default: true },
    },
    default: {},
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Схема баланса LibreChat
const balanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true,
  },
  tokenCredits: {
    type: Number,
    default: 0,
  },
  autoRefillEnabled: {
    type: Boolean,
    default: false,
  },
  refillIntervalValue: {
    type: Number,
    default: 30,
  },
  refillIntervalUnit: {
    type: String,
    enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
    default: 'days',
  },
  lastRefill: {
    type: Date,
    default: Date.now,
  },
  refillAmount: {
    type: Number,
    default: 0,
  },
});

const Balance = mongoose.model('Balance', balanceSchema);

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied', 
      message: 'No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Invalid token', 
      message: 'Token is not valid' 
    });
  }
};

// Middleware для проверки роли ADMIN
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Admin role required' 
    });
  }
  next();
};

// Health check (публичный)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Commercial API server is running',
    timestamp: new Date().toISOString()
  });
});

// Главная страница API (публичная)
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
        .button.secondary { background: #6c757d; }
        .button.danger { background: #dc3545; }
        .result { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; margin-top: 15px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; }
        .auth-section { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin: 20px 0; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .token-display { background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 MetoGPT Commercial API</h1>
        <p>Этот сервер предоставляет API для управления коммерческими функциями LibreChat.</p>
        
        <div class="status success">
            ✅ LibreChat работает на <a href="http://localhost:3080" target="_blank">http://localhost:3080</a>
        </div>
        
        <div class="auth-section">
            <h2>🔐 Аутентификация</h2>
            <p><strong>Внимание:</strong> Все API endpoints требуют JWT токен для доступа!</p>
            
            <div class="form-group">
                <label>Email:</label>
                <input type="email" id="loginEmail" placeholder="admin@example.com" value="admin@example.com">
            </div>
            <div class="form-group">
                <label>Пароль:</label>
                <input type="password" id="loginPassword" placeholder="password" value="admin123">
            </div>
            <button class="button" onclick="login()">Войти</button>
            <button class="button secondary" onclick="createAdmin()">Создать Admin</button>
            
            <div id="tokenResult" style="display: none;">
                <h3>Ваш JWT токен:</h3>
                <div class="token-display" id="jwtToken"></div>
                <p><strong>Используйте этот токен в заголовке:</strong></p>
                <code>Authorization: Bearer YOUR_TOKEN</code>
            </div>
        </div>
        
        <h2>📊 Статус сервера</h2>
        <button class="button" onclick="checkHealth()">Проверить статус</button>
        <div id="healthResult" class="result" style="display: none;"></div>
        
        <h2>🔐 API Endpoints (требуют авторизации)</h2>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/admin/users</span>
            <p>Получить список всех пользователей (требует ADMIN)</p>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/admin/roles</span>
            <p>Получить список всех ролей (требует ADMIN)</p>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api/admin/roles</span>
            <p>Создать новую роль (требует ADMIN)</p>
        </div>
        
        <div class="endpoint">
            <span class="method">PUT</span> <span class="url">/api/admin/users/:userId/balance</span>
            <p>Обновить баланс пользователя (требует ADMIN)</p>
        </div>
        
        <div class="endpoint">
            <span class="method">PUT</span> <span class="url">/api/admin/users/:userId/role</span>
            <p>Изменить роль пользователя (требует ADMIN)</p>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/admin/users/:userId/models</span>
            <p>Получить доступные модели для пользователя (требует ADMIN)</p>
        </div>
        
        <hr>
        <p><strong>LibreChat:</strong> <a href="http://localhost:3080" target="_blank">http://localhost:3080</a></p>
        <p><strong>Commercial API:</strong> <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></p>
    </div>

    <script>
        let currentToken = '';
        
        async function makeRequest(url, options = {}) {
            try {
                if (currentToken) {
                    options.headers = {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + currentToken,
                        ...options.headers
                    };
                }
                
                const response = await fetch(url, options);
                const data = await response.json();
                return { success: response.ok, data, status: response.status };
            } catch (error) {
                return { success: false, data: { error: error.message }, status: 0 };
            }
        }
        
        async function login() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    currentToken = data.token;
                    document.getElementById('jwtToken').textContent = currentToken;
                    document.getElementById('tokenResult').style.display = 'block';
                    alert('Успешный вход! Токен получен.');
                } else {
                    alert('Ошибка входа: ' + data.message);
                }
            } catch (error) {
                alert('Ошибка: ' + error.message);
            }
        }
        
        async function createAdmin() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                const response = await fetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email, 
                        password, 
                        username: 'admin',
                        name: 'Administrator',
                        role: 'ADMIN'
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Admin пользователь создан! Теперь можете войти.');
                } else {
                    alert('Ошибка создания: ' + data.message);
                }
            } catch (error) {
                alert('Ошибка: ' + error.message);
            }
        }
        
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

// Аутентификация
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Находим пользователя
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid email or password' 
      });
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid email or password' 
      });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message 
    });
  }
});

// Регистрация (разрешена для admin пользователей)
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, username, name, role } = req.body;

    // Проверяем, есть ли уже пользователи
    const userCount = await User.countDocuments();
    if (userCount > 0 && role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Registration disabled',
        message: 'Registration is only allowed for ADMIN users' 
      });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const user = new User({
      email,
      password: hashedPassword,
      username,
      name,
      role: role || 'ADMIN'
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message 
    });
  }
});

// GET /api/admin/users (требует ADMIN)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Исключаем пароли
    
    // Получаем балансы для всех пользователей
    const usersWithBalance = await Promise.all(
      users.map(async (user) => {
        const balance = await Balance.findOne({ user: user._id });
        return {
          ...user.toObject(),
          balance: balance ? balance.tokenCredits : 0,
          balanceId: balance ? balance._id : null,
        };
      })
    );
    
    res.json({
      users: usersWithBalance,
      total: usersWithBalance.length,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

// GET /api/admin/roles (требует ADMIN)
app.get('/api/admin/roles', authenticateToken, requireAdmin, async (req, res) => {
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

// POST /api/admin/roles (требует ADMIN)
app.post('/api/admin/roles', authenticateToken, requireAdmin, async (req, res) => {
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

// PUT /api/admin/users/:userId/balance (требует ADMIN)
app.put('/api/admin/users/:userId/balance', authenticateToken, requireAdmin, async (req, res) => {
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

    // Находим или создаем запись баланса
    let balanceRecord = await Balance.findOne({ user: userId });
    const oldBalance = balanceRecord ? balanceRecord.tokenCredits : 0;
    
    if (!balanceRecord) {
      balanceRecord = new Balance({
        user: userId,
        tokenCredits: balance,
      });
    } else {
      balanceRecord.tokenCredits = balance;
    }
    
    await balanceRecord.save();

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

// PUT /api/admin/users/:userId/role (требует ADMIN)
app.put('/api/admin/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
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

// GET /api/admin/users/:userId/models (требует ADMIN)
app.get('/api/admin/users/:userId/models', authenticateToken, requireAdmin, async (req, res) => {
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

// ВРЕМЕННЫЙ endpoint для изменения роли пользователя (без проверки admin)
app.put('/api/admin/users/:userId/role-temp', authenticateToken, async (req, res) => {
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

// Запуск сервера
async function startServer() {
  try {
    await connectDb();
    
    app.listen(PORT, () => {
      console.log(`🚀 Commercial API server running on http://localhost:${PORT}`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Login: http://localhost:${PORT}/auth/login`);
      console.log(`🔧 Admin API: http://localhost:${PORT}/api/admin`);
      console.log(`📊 Users: http://localhost:${PORT}/api/admin/users`);
      console.log(`👥 Roles: http://localhost:${PORT}/api/admin/roles`);
      console.log(`\n🎯 Теперь у вас есть:`);
      console.log(`   • LibreChat на порту 3080`);
      console.log(`   • Commercial API на порту 3000 (с JWT аутентификацией)`);
      console.log(`   • MongoDB на порту 27017`);
      console.log(`\n🔐 Для доступа к API:`);
      console.log(`   1. Создайте admin пользователя через веб-интерфейс`);
      console.log(`   2. Войдите и получите JWT токен`);
      console.log(`   3. Используйте токен в заголовке Authorization`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
