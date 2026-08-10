import { Inject, Injectable } from '@nestjs/common';
import {
  IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '../../domain/role-permission/role-permission.repository';
import { AccessLevel, Section } from '../../domain/role-permission/role-permission.entity';
import { UserRole } from '../../domain/types/role';

/** Matrix shape consumed by the frontend: { role: { section: level } }. */
export type PermissionMatrix = Partial<Record<UserRole, Partial<Record<Section, AccessLevel>>>>;

@Injectable()
export class GetRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_PERMISSION_REPOSITORY) private readonly repo: IRolePermissionRepository,
  ) {}

  /**
   * Returns only what has been explicitly stored. The frontend layers this over
   * its built-in defaults, so an empty table means "defaults apply".
   */
  async execute(): Promise<PermissionMatrix> {
    const entries = await this.repo.findAll();
    const matrix: PermissionMatrix = {};
    for (const entry of entries) {
      (matrix[entry.role] ??= {})[entry.section] = entry.level;
    }
    return matrix;
  }
}
