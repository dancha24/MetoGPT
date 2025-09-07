#!/usr/bin/env node

const axios = require('axios');

// Конфигурация
const BASE_URL = 'http://localhost:3080/api/admin';
const JWT_TOKEN = process.env.JWT_TOKEN || 'your-jwt-token-here';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Тестовые данные
const testRole = {
  name: 'TEST_ROLE',
  permissions: {
    PROMPTS: {
      USE: true,
      CREATE: true,
    },
    ROLE_MANAGEMENT: {
      CREATE: false,
      UPDATE: false,
      DELETE: false,
    },
    BALANCE_MANAGEMENT: {
      UPDATE: false,
    },
  },
  modelAccess: {
    'gpt-4-turbo': {
      enabled: true,
      coefficient: 1.5,
    },
    'claude-3-opus': {
      enabled: true,
      coefficient: 1.8,
    },
  },
};

async function testAdminAPI() {
  console.log('🧪 Testing Admin API...\n');

  try {
    // 1. Получить список пользователей
    console.log('1. Testing GET /users');
    const usersResponse = await api.get('/users');
    console.log('✅ Users list:', usersResponse.data.total, 'users found');
    
    if (usersResponse.data.users.length > 0) {
      const testUserId = usersResponse.data.users[0]._id;
      console.log('   Test user ID:', testUserId);

      // 2. Получить доступные модели пользователя
      console.log('\n2. Testing GET /users/:userId/models');
      const modelsResponse = await api.get(`/users/${testUserId}/models`);
      console.log('✅ User models:', modelsResponse.data.availableModels.length, 'models available');

      // 3. Установить баланс пользователя
      console.log('\n3. Testing PUT /users/:userId/balance');
      const setBalanceResponse = await api.put(`/users/${testUserId}/balance`, {
        balance: 1000,
        reason: 'Test balance setup',
      });
      console.log('✅ Balance set:', setBalanceResponse.data.message);

      // 4. Изменить баланс пользователя
      console.log('\n4. Testing PATCH /users/:userId/balance');
      const adjustBalanceResponse = await api.patch(`/users/${testUserId}/balance`, {
        amount: 100,
        reason: 'Test bonus',
      });
      console.log('✅ Balance adjusted:', adjustBalanceResponse.data.message);

      // 5. Изменить роль пользователя
      console.log('\n5. Testing PUT /users/:userId/role');
      const oldRole = usersResponse.data.users[0].role;
      const updateRoleResponse = await api.put(`/users/${testUserId}/role`, {
        role: 'USER',
      });
      console.log('✅ Role updated:', updateRoleResponse.data.message);
    }

    // 6. Получить список ролей
    console.log('\n6. Testing GET /roles');
    const rolesResponse = await api.get('/roles');
    console.log('✅ Roles list:', rolesResponse.data.total, 'roles found');

    // 7. Создать новую роль
    console.log('\n7. Testing POST /roles');
    const createRoleResponse = await api.post('/roles', testRole);
    console.log('✅ Role created:', createRoleResponse.data.message);

    // 8. Обновить роль
    console.log('\n8. Testing PUT /roles/:roleName');
    const updateRoleData = {
      modelAccess: {
        'gpt-4-turbo': {
          enabled: true,
          coefficient: 1.6,
        },
      },
    };
    const updateRoleResponse = await api.put(`/roles/${testRole.name}`, updateRoleData);
    console.log('✅ Role updated:', updateRoleResponse.data.message);

    // 9. Удалить тестовую роль
    console.log('\n9. Testing DELETE /roles/:roleName');
    const deleteRoleResponse = await api.delete(`/roles/${testRole.name}`);
    console.log('✅ Role deleted:', deleteRoleResponse.data.message);

    console.log('\n🎉 All tests passed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Запуск тестов
if (require.main === module) {
  if (!JWT_TOKEN || JWT_TOKEN === 'your-jwt-token-here') {
    console.error('❌ Please set JWT_TOKEN environment variable');
    console.error('Example: JWT_TOKEN=your-token node test-admin-api.js');
    process.exit(1);
  }
  
  testAdminAPI();
}

module.exports = { testAdminAPI };

