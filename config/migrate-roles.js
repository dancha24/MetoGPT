#!/usr/bin/env node

require('dotenv').config();
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, '..') });

const { connectDb } = require('../api/db');
const { Role } = require('../api/db/models');
const { SystemRoles, roleDefaults } = require('librechat-data-provider');
const { logger } = require('@librechat/data-schemas');

/**
 * Миграция ролей для добавления новых разрешений и структуры modelAccess
 */
async function migrateRoles() {
  try {
    await connectDb();
    logger.info('Connected to database');

    // Получаем все существующие роли
    const roles = await Role.find({});
    logger.info(`Found ${roles.length} roles to migrate`);

    let migratedCount = 0;

    for (const role of roles) {
      let hasChanges = false;
      const updates = {};

      // Проверяем и добавляем новые разрешения
      if (!role.permissions) {
        role.permissions = {};
        hasChanges = true;
      }

      // Добавляем ROLE_MANAGEMENT разрешения
      if (!role.permissions.ROLE_MANAGEMENT) {
        role.permissions.ROLE_MANAGEMENT = {
          CREATE: role.name === SystemRoles.ADMIN,
          UPDATE: role.name === SystemRoles.ADMIN,
          DELETE: role.name === SystemRoles.ADMIN,
        };
        hasChanges = true;
      }

      // Добавляем BALANCE_MANAGEMENT разрешения
      if (!role.permissions.BALANCE_MANAGEMENT) {
        role.permissions.BALANCE_MANAGEMENT = {
          UPDATE: role.name === SystemRoles.ADMIN,
        };
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
        logger.info(`Migrated role: ${role.name}`);
      }
    }

    // Создаем роли по умолчанию если их нет
    for (const [roleName, defaultRole] of Object.entries(roleDefaults)) {
      const existingRole = await Role.findOne({ name: roleName });
      if (!existingRole) {
        const newRole = new Role({
          ...defaultRole,
          modelAccess: new Map(),
        });
        await newRole.save();
        migratedCount++;
        logger.info(`Created default role: ${roleName}`);
      }
    }

    logger.info(`Migration completed: ${migratedCount} roles processed`);
    
    // Выводим статистику
    const finalRoles = await Role.find({});
    logger.info('Final roles state:');
    for (const role of finalRoles) {
      logger.info(`- ${role.name}: ${role.modelAccess ? role.modelAccess.size : 0} models configured`);
    }

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Запуск миграции
if (require.main === module) {
  migrateRoles();
}

module.exports = { migrateRoles };
