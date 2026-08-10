import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import {
  GetRolePermissionsUseCase,
  PermissionMatrix,
} from '../../application/use-cases/get-role-permissions.use-case';
import { SaveRolePermissionsUseCase } from '../../application/use-cases/save-role-permissions.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('role-permissions')
export class RolePermissionsController {
  constructor(
    private readonly getRolePermissions: GetRolePermissionsUseCase,
    private readonly saveRolePermissions: SaveRolePermissionsUseCase,
  ) {}

  /** Readable by any signed-in user — the UI gates itself on this. */
  @Get()
  async findAll() {
    return this.getRolePermissions.execute();
  }

  @Put()
  @Roles('sysadmin')
  async update(@Body() matrix: PermissionMatrix) {
    return this.saveRolePermissions.execute(matrix);
  }

  /** Clears all overrides so the built-in defaults apply again. */
  @Delete()
  @Roles('sysadmin')
  async reset() {
    await this.saveRolePermissions.reset();
    return this.getRolePermissions.execute();
  }
}
