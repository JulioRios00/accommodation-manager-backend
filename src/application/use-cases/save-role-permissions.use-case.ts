import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '../../domain/role-permission/role-permission.repository';
import {
  ACCESS_LEVELS,
  AccessLevel,
  Section,
  SECTIONS,
} from '../../domain/role-permission/role-permission.entity';
import { UserRole } from '../../domain/types/role';
import { GetRolePermissionsUseCase, PermissionMatrix } from './get-role-permissions.use-case';

/** sysadmin is deliberately not editable — it always keeps Full access. */
const EDITABLE_ROLES: UserRole[] = ['manager', 'administrator', 'staff', 'maintenance'];

@Injectable()
export class SaveRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_PERMISSION_REPOSITORY) private readonly repo: IRolePermissionRepository,
    private readonly getRolePermissions: GetRolePermissionsUseCase,
  ) {}

  async execute(matrix: PermissionMatrix): Promise<PermissionMatrix> {
    const entries: { role: UserRole; section: Section; level: AccessLevel }[] = [];

    for (const [role, sections] of Object.entries(matrix ?? {})) {
      if (!EDITABLE_ROLES.includes(role as UserRole)) {
        throw new BadRequestException(`Role "${role}" cannot be edited`);
      }
      for (const [section, level] of Object.entries(sections ?? {})) {
        if (!SECTIONS.includes(section as Section)) {
          throw new BadRequestException(`Unknown section: ${section}`);
        }
        if (!ACCESS_LEVELS.includes(level as AccessLevel)) {
          throw new BadRequestException(`Invalid access level: ${level}`);
        }
        entries.push({
          role: role as UserRole,
          section: section as Section,
          level: level as AccessLevel,
        });
      }
    }

    await this.repo.saveMany(entries);
    return this.getRolePermissions.execute();
  }

  /** Drops every override so the frontend falls back to its built-in defaults. */
  async reset(): Promise<void> {
    await this.repo.deleteAll();
  }
}
