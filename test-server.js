#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Подключение к базе данных
async function connectDb() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/LibreChat';
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Схемы
const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  name: String,
  role: { type: String, default: 'USER' },
  createdAt: { type: Date, default: Date.now },
});

const balanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tokenCredits: { type: Number, default: 0 },
});

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
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

const User = mongoose.model('User', userSchema);
const Balance = mongoose.model('Balance', balanceSchema);
const Role = mongoose.model('Role', roleSchema);

const app = express();
const PORT = 3080;

app.use(cors());
app.use(express.json());

// Простая аутентификация (для тестирования)
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-id' };
  next();
};

// Тестовые эндпоинты
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server is running' });
});

// GET /api/admin/users
app.get('/api/admin/users', mockAuth, async (req, res) => {
  try {
    const users = await User.find({}).lean();
    const usersWithBalances = await Promise.all(
      users.map(async (user) => {
        const balance = await Balance.findOne({ user: user._id }).lean();
        return {
          ...user,
          balance: balance?.tokenCredits || 0,
        };
      })
    );

    res.json({
      users: usersWithBalances,
      total: usersWithBalances.length,
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
    const roles = await Role.find({}).lean();
    
    const rolesWithModelAccess = roles.map(role => {
      let modelAccess = {};
      if (role.modelAccess) {
        // MongoDB Map преобразуется в объект с ключами как строками
        if (typeof role.modelAccess === 'object' && !Array.isArray(role.modelAccess)) {
          modelAccess = role.modelAccess;
        }
      }
      
      return {
        ...role,
        modelAccess,
      };
    });

    res.json({
      roles: rolesWithModelAccess,
      total: rolesWithModelAccess.length,
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

    const roleData = {
      name: name.toUpperCase(),
      permissions: permissions || {},
      modelAccess: modelAccess ? new Map(Object.entries(modelAccess)) : new Map(),
    };

    const newRole = new Role(roleData);
    await newRole.save();

    res.status(201).json({
      message: 'Role created successfully',
      role: {
        ...newRole.toObject(),
        modelAccess: Object.fromEntries(newRole.modelAccess || new Map()),
      },
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

    let balanceRecord = await Balance.findOne({ user: userId });
    if (!balanceRecord) {
      balanceRecord = new Balance({ user: userId });
    }

    const oldBalance = balanceRecord.tokenCredits;
    balanceRecord.tokenCredits = balance;
    await balanceRecord.save();

    res.json({
      message: 'Balance updated successfully',
      userId,
      oldBalance,
      newBalance: balance,
      change: balance - oldBalance,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update balance',
      message: error.message 
    });
  }
});

// Создаем тестовые данные при запуске
async function createTestData() {
  try {
    // Создаем тестового пользователя
    const testUser = await User.findOneAndUpdate(
      { email: 'test@example.com' },
      {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        role: 'USER',
      },
      { upsert: true, new: true }
    );

    // Создаем баланс для пользователя
    await Balance.findOneAndUpdate(
      { user: testUser._id },
      { tokenCredits: 1000 },
      { upsert: true }
    );

    console.log('Test data created successfully');
  } catch (error) {
    console.error('Failed to create test data:', error);
  }
}

// Запуск сервера
async function startServer() {
  try {
    await connectDb();
    await createTestData();

    app.listen(PORT, () => {
      console.log(`Test server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Admin API: http://localhost:${PORT}/api/admin`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
