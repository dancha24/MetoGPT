const express = require('express');
const { z } = require('zod');
const { 
  getUserRole, 
  hasRoleManagementPermission, 
  hasBalanceManagementPermission,
  getUserAvailableModels 
} = require('~/models/roleMethods');
const { updateRoleByName, getRoleByName } = require('~/models/Role');
const { User } = require('~/db/models');
const { Balance } = require('~/db/models');
const { createTransaction } = require('~/models/Transaction');
const { requireJwtAuth } = require('../middleware');

const router = express.Router();

// Middleware для проверки прав администратора
const requireAdminPermission = async (req, res, next) => {
  try {
    const hasPermission = await hasRoleManagementPermission(req.user.id, 'UPDATE');
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Admin permission required' 
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ 
      error: 'Permission check failed',
      message: error.message 
    });
  }
};

// Middleware для проверки прав управления балансами
const requireBalancePermission = async (req, res, next) => {
  try {
    const hasPermission = await hasBalanceManagementPermission(req.user.id);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Balance management permission required' 
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ 
      error: 'Permission check failed',
      message: error.message 
    });
  }
};

// Схемы валидации
const updateBalanceSchema = z.object({
  balance: z.number().min(0),
  reason: z.string().optional(),
});

const adjustBalanceSchema = z.object({
  amount: z.number(),
  reason: z.string().optional(),
});

const updateUserRoleSchema = z.object({
  role: z.string(),
});

const createRoleSchema = z.object({
  name: z.string().min(1),
  permissions: z.object({}).optional(),
  modelAccess: z.record(z.object({
    enabled: z.boolean(),
    coefficient: z.number().min(0.1).max(10.0),
  })).optional(),
});

const updateRoleSchema = z.object({
  permissions: z.object({}).optional(),
  modelAccess: z.record(z.object({
    enabled: z.boolean(),
    coefficient: z.number().min(0.1).max(10.0),
  })).optional(),
});

/**
 * GET /api/admin/users
 * Получить список всех пользователей
 */
router.get('/users', requireJwtAuth, requireAdminPermission, async (req, res) => {
  try {
    const users = await User.find({})
      .select('_id email username name role createdAt')
      .lean();

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

/**
 * PUT /api/admin/users/:userId/balance
 * Установить точный баланс пользователя
 */
router.put('/users/:userId/balance', requireJwtAuth, requireBalancePermission, async (req, res) => {
  try {
    const { userId } = req.params;
    const { balance, reason } = updateBalanceSchema.parse(req.body);

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

    // Создаем транзакцию для записи изменения
    await createTransaction({
      user: userId,
      tokenType: 'credits',
      context: 'admin_balance_set',
      rawAmount: balance - oldBalance,
      metadata: { reason, adminId: req.user.id },
    });

    res.json({
      message: 'Balance updated successfully',
      userId,
      oldBalance,
      newBalance: balance,
      change: balance - oldBalance,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Failed to update balance',
      message: error.message 
    });
  }
});

/**
 * PATCH /api/admin/users/:userId/balance
 * Изменить баланс пользователя (добавить/отнять)
 */
router.patch('/users/:userId/balance', requireJwtAuth, requireBalancePermission, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = adjustBalanceSchema.parse(req.body);

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
    balanceRecord.tokenCredits = Math.max(0, oldBalance + amount);
    await balanceRecord.save();

    // Создаем транзакцию для записи изменения
    await createTransaction({
      user: userId,
      tokenType: 'credits',
      context: 'admin_balance_adjust',
      rawAmount: amount,
      metadata: { reason, adminId: req.user.id },
    });

    res.json({
      message: 'Balance adjusted successfully',
      userId,
      oldBalance,
      newBalance: balanceRecord.tokenCredits,
      change: amount,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Failed to adjust balance',
      message: error.message 
    });
  }
});

/**
 * PUT /api/admin/users/:userId/role
 * Изменить роль пользователя
 */
router.put('/users/:userId/role', requireJwtAuth, requireAdminPermission, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = updateUserRoleSchema.parse(req.body);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User with specified ID does not exist' 
      });
    }

    // Проверяем существование роли
    const roleExists = await getRoleByName(role);
    if (!roleExists) {
      return res.status(400).json({ 
        error: 'Invalid role',
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
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Failed to update user role',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/roles
 * Получить список всех ролей
 */
router.get('/roles', requireJwtAuth, requireAdminPermission, async (req, res) => {
  try {
    const roles = await Role.find({}).lean();
    
    const rolesWithModelAccess = roles.map(role => ({
      ...role,
      modelAccess: role.modelAccess ? Object.fromEntries(role.modelAccess) : {},
    }));

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

/**
 * POST /api/admin/roles
 * Создать новую роль
 */
router.post('/roles', requireJwtAuth, requireAdminPermission, async (req, res) => {
  try {
    const { name, permissions, modelAccess } = createRoleSchema.parse(req.body);

    // Проверяем, что роль с таким именем не существует
    const existingRole = await getRoleByName(name);
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
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Failed to create role',
      message: error.message 
    });
  }
});

/**
 * PUT /api/admin/roles/:roleName
 * Обновить существующую роль
 */
router.put('/roles/:roleName', requireJwtAuth, requireAdminPermission, async (req, res) => {
  try {
    const { roleName } = req.params;
    const { permissions, modelAccess } = updateRoleSchema.parse(req.body);

    const role = await getRoleByName(roleName);
    if (!role) {
      return res.status(404).json({ 
        error: 'Role not found',
        message: 'Role with specified name does not exist' 
      });
    }

    const updates = {};
    if (permissions) {
      updates.permissions = { ...role.permissions, ...permissions };
    }
    if (modelAccess) {
      updates.modelAccess = new Map(Object.entries(modelAccess));
    }

    const updatedRole = await updateRoleByName(roleName, updates);

    res.json({
      message: 'Role updated successfully',
      role: {
        ...updatedRole,
        modelAccess: Object.fromEntries(updatedRole.modelAccess || new Map()),
      },
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Failed to update role',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/admin/roles/:roleName
 * Удалить роль
 */
router.delete('/roles/:roleName', requireJwtAuth, requireAdminPermission, async (req, res) => {
  try {
    const { roleName } = req.params;

    const role = await getRoleByName(roleName);
    if (!role) {
      return res.status(404).json({ 
        error: 'Role not found',
        message: 'Role with specified name does not exist' 
      });
    }

    // Проверяем, что роль не используется пользователями
    const usersWithRole = await User.countDocuments({ role: roleName });
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        error: 'Role in use',
        message: `Cannot delete role: ${usersWithRole} users are using this role` 
      });
    }

    await Role.deleteOne({ name: roleName });

    res.json({
      message: 'Role deleted successfully',
      roleName,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to delete role',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/users/:userId/models
 * Получить доступные модели для пользователя
 */
router.get('/users/:userId/models', requireJwtAuth, requireAdminPermission, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User with specified ID does not exist' 
      });
    }

    const availableModels = await getUserAvailableModels(userId);

    res.json({
      userId,
      availableModels,
      total: availableModels.length,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch user models',
      message: error.message 
    });
  }
});

module.exports = router;

