const { logger } = require('@librechat/data-schemas');
const { getRoleByName } = require('./Role');
const { User } = require('~/db/models');

/**
 * Get user's role with model access configuration
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Role with model access
 */
const getUserRole = async (userId) => {
  try {
    const user = await User.findById(userId).select('role').lean();
    if (!user) {
      throw new Error('User not found');
    }
    
    const role = await getRoleByName(user.role);
    return role;
  } catch (error) {
    logger.error(`Failed to get user role: ${error.message}`);
    throw error;
  }
};

/**
 * Check if user has access to a specific model
 * @param {string} userId - User ID
 * @param {string} modelName - Model name
 * @returns {Promise<Object>} Access info with coefficient
 */
const checkModelAccess = async (userId, modelName) => {
  try {
    const role = await getUserRole(userId);
    
    if (!role.modelAccess || !role.modelAccess.has(modelName)) {
      return {
        hasAccess: false,
        coefficient: 1.0,
        message: 'Model not configured for this role'
      };
    }
    
    const modelConfig = role.modelAccess.get(modelName);
    
    return {
      hasAccess: modelConfig.enabled,
      coefficient: modelConfig.coefficient,
      message: modelConfig.enabled ? 'Access granted' : 'Model disabled for this role'
    };
  } catch (error) {
    logger.error(`Failed to check model access: ${error.message}`);
    return {
      hasAccess: false,
      coefficient: 1.0,
      message: 'Error checking model access'
    };
  }
};

/**
 * Get model coefficient for user
 * @param {string} userId - User ID
 * @param {string} modelName - Model name
 * @returns {Promise<number>} Model coefficient
 */
const getModelCoefficient = async (userId, modelName) => {
  const accessInfo = await checkModelAccess(userId, modelName);
  return accessInfo.coefficient;
};

/**
 * Check if user has permission for role management
 * @param {string} userId - User ID
 * @param {string} permission - Permission to check (CREATE, UPDATE, DELETE)
 * @returns {Promise<boolean>} Has permission
 */
const hasRoleManagementPermission = async (userId, permission) => {
  try {
    const role = await getUserRole(userId);
    return role.permissions?.ROLE_MANAGEMENT?.[permission] || false;
  } catch (error) {
    logger.error(`Failed to check role management permission: ${error.message}`);
    return false;
  }
};

/**
 * Check if user has permission for balance management
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Has permission
 */
const hasBalanceManagementPermission = async (userId) => {
  try {
    const role = await getUserRole(userId);
    return role.permissions?.BALANCE_MANAGEMENT?.UPDATE || false;
  } catch (error) {
    logger.error(`Failed to check balance management permission: ${error.message}`);
    return false;
  }
};

/**
 * Get all available models for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of available models with coefficients
 */
const getUserAvailableModels = async (userId) => {
  try {
    const role = await getUserRole(userId);
    const availableModels = [];
    
    if (role.modelAccess) {
      for (const [modelName, config] of role.modelAccess.entries()) {
        if (config.enabled) {
          availableModels.push({
            name: modelName,
            coefficient: config.coefficient
          });
        }
      }
    }
    
    return availableModels;
  } catch (error) {
    logger.error(`Failed to get user available models: ${error.message}`);
    return [];
  }
};

module.exports = {
  getUserRole,
  checkModelAccess,
  getModelCoefficient,
  hasRoleManagementPermission,
  hasBalanceManagementPermission,
  getUserAvailableModels,
};

