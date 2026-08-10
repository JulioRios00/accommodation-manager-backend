import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccessLevel,
  RolePermission,
  Section,
} from '../../../../domain/role-permission/role-permission.entity';
import { IRolePermissionRepository } from '../../../../domain/role-permission/role-permission.repository';
import { UserRole } from '../../../../domain/types/role';
import { RolePermissionOrmEntity } from '../entities/role-permission.orm-entity';

@Injectable()
export class RolePermissionTypeOrmRepository implements IRolePermissionRepository {
  constructor(
    @InjectRepository(RolePermissionOrmEntity)
    private readonly repo: Repository<RolePermissionOrmEntity>,
  ) {}

  async findAll(): Promise<RolePermission[]> {
    const entities = await this.repo.find();
    return entities.map(this.toDomain);
  }

  async saveMany(
    entries: Pick<RolePermission, 'role' | 'section' | 'level'>[],
  ): Promise<RolePermission[]> {
    if (!entries.length) return [];
    await this.repo.upsert(
      entries.map((e) => ({ role: e.role, section: e.section, level: e.level })),
      { conflictPaths: ['role', 'section'] },
    );
    return this.findAll();
  }

  async deleteAll(): Promise<void> {
    await this.repo.clear();
  }

  private toDomain(entity: RolePermissionOrmEntity): RolePermission {
    const p = new RolePermission();
    p.id = entity.id;
    p.role = entity.role as UserRole;
    p.section = entity.section as Section;
    p.level = entity.level as AccessLevel;
    p.updatedAt = entity.updatedAt;
    return p;
  }
}
