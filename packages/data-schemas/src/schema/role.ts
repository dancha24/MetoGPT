import { Schema } from 'mongoose';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { IRole } from '~/types';

/**
 * Schema for model access configuration
 */
const modelAccessSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    coefficient: { type: Number, default: 1.0, min: 0.1, max: 10.0 },
  },
  { _id: false },
);

/**
 * Uses a sub-schema for permissions. Notice we disable `_id` for this subdocument.
 */
const rolePermissionsSchema = new Schema(
  {
    [PermissionTypes.BOOKMARKS]: {
      [Permissions.USE]: { type: Boolean },
    },
    [PermissionTypes.PROMPTS]: {
      [Permissions.SHARED_GLOBAL]: { type: Boolean },
      [Permissions.USE]: { type: Boolean },
      [Permissions.CREATE]: { type: Boolean },
    },
    [PermissionTypes.MEMORIES]: {
      [Permissions.USE]: { type: Boolean },
      [Permissions.CREATE]: { type: Boolean },
      [Permissions.UPDATE]: { type: Boolean },
      [Permissions.READ]: { type: Boolean },
      [Permissions.OPT_OUT]: { type: Boolean },
    },
    [PermissionTypes.AGENTS]: {
      [Permissions.SHARED_GLOBAL]: { type: Boolean },
      [Permissions.USE]: { type: Boolean },
      [Permissions.CREATE]: { type: Boolean },
    },
    [PermissionTypes.MULTI_CONVO]: {
      [Permissions.USE]: { type: Boolean },
    },
    [PermissionTypes.TEMPORARY_CHAT]: {
      [Permissions.USE]: { type: Boolean },
    },
    [PermissionTypes.RUN_CODE]: {
      [Permissions.USE]: { type: Boolean },
    },
    [PermissionTypes.WEB_SEARCH]: {
      [Permissions.USE]: { type: Boolean },
    },
    [PermissionTypes.PEOPLE_PICKER]: {
      [Permissions.VIEW_USERS]: { type: Boolean },
      [Permissions.VIEW_GROUPS]: { type: Boolean },
      [Permissions.VIEW_ROLES]: { type: Boolean },
    },
    [PermissionTypes.MARKETPLACE]: {
      [Permissions.USE]: { type: Boolean },
    },
    [PermissionTypes.FILE_SEARCH]: {
      [Permissions.USE]: { type: Boolean },
    },
    [PermissionTypes.FILE_CITATIONS]: {
      [Permissions.USE]: { type: Boolean },
    },
    // Новые разрешения для управления ролями и балансами
    [PermissionTypes.ROLE_MANAGEMENT]: {
      [Permissions.CREATE]: { type: Boolean },
      [Permissions.UPDATE]: { type: Boolean },
      [Permissions.DELETE]: { type: Boolean },
    },
    [PermissionTypes.BALANCE_MANAGEMENT]: {
      [Permissions.UPDATE]: { type: Boolean },
    },
  },
  { _id: false },
);

const roleSchema: Schema<IRole> = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  permissions: {
    type: rolePermissionsSchema,
  },
  // Новое поле для управления доступом к моделям
  modelAccess: {
    type: Map,
    of: modelAccessSchema,
    default: new Map(),
  },
});

export default roleSchema;
