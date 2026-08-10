import { RolePermission } from './role-permission.entity';

export interface IRolePermissionRepository {
  findAll(): Promise<RolePermission[]>;
  /** Upserts every entry by (role, section). */
  saveMany(entries: Pick<RolePermission, 'role' | 'section' | 'level'>[]): Promise<RolePermission[]>;
  deleteAll(): Promise<void>;
}

export const ROLE_PERMISSION_REPOSITORY = 'ROLE_PERMISSION_REPOSITORY';
