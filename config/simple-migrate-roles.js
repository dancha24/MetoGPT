#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

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

/**
 * Миграция ролей для добавления новых разрешений и структуры modelAccess
 */
async function migrateRoles() {
  try {
    await connectDb();

    // Получаем все существующие роли
    const roles = await Role.find({});
    console.log(`Found ${roles.length} roles to migrate`);

    let migratedCount = 0;

    for (const role of roles) {
      let hasChanges = false;

      // Проверяем и добавляем новые разрешения
      if (!role.permissions) {
        role.permissions = new Map();
        hasChanges = true;
      }

      // Добавляем ROLE_MANAGEMENT разрешения
      if (!role.permissions.has('ROLE_MANAGEMENT')) {
        role.permissions.set('ROLE_MANAGEMENT', {
          CREATE: role.name === 'ADMIN',
          UPDATE: role.name === 'ADMIN',
          DELETE: role.name === 'ADMIN',
        });
        hasChanges = true;
      }

      // Добавляем BALANCE_MANAGEMENT разрешения
      if (!role.permissions.has('BALANCE_MANAGEMENT')) {
        role.permissions.set('BALANCE_MANAGEMENT', {
          UPDATE: role.name === 'ADMIN',
        });
        hasChanges = true;
      }

      // Добавляем поле modelAccess если его нет
      if (!role.modelAccess) {
        role.modelAccess = new Map();
        hasChanges = true;
      }

      // Если есть изменения, сохраняем роль
      if (hasChanges) {
        await role.save();
        migratedCount++;
        console.log(`Migrated role: ${role.name}`);
      }
    }

    // Создаем роли по умолчанию если их нет
    const defaultRoles = [
      {
        name: 'ADMIN',
        permissions: new Map([
          ['ROLE_MANAGEMENT', { CREATE: true, UPDATE: true, DELETE: true }],
          ['BALANCE_MANAGEMENT', { UPDATE: true }],
        ]),
        modelAccess: new Map(),
      },
      {
        name: 'USER',
        permissions: new Map([
          ['ROLE_MANAGEMENT', { CREATE: false, UPDATE: false, DELETE: false }],
          ['BALANCE_MANAGEMENT', { UPDATE: false }],
        ]),
        modelAccess: new Map(),
      },
    ];

    for (const defaultRole of defaultRoles) {
      const existingRole = await Role.findOne({ name: defaultRole.name });
      if (!existingRole) {
        const newRole = new Role(defaultRole);
        await newRole.save();
        migratedCount++;
        console.log(`Created default role: ${defaultRole.name}`);
      }
    }

    console.log(`Migration completed: ${migratedCount} roles processed`);
    
    // Выводим статистику
    const finalRoles = await Role.find({});
    console.log('Final roles state:');
    for (const role of finalRoles) {
      console.log(`- ${role.name}: ${role.modelAccess ? role.modelAccess.size : 0} models configured`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Запуск миграции
if (require.main === module) {
  migrateRoles();
}

module.exports = { migrateRoles };

