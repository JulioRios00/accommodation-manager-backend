import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RESET_CONFIRMATION } from '../../application/use-cases/reset-database.use-case';

const resetResult = { tables: [{ table: 'beds', rows: 342 }], rowsDeleted: 342, tablesCleared: 28, completedAt: new Date() };

function build() {
  const execute = jest.fn(async () => resetResult);
  const countRows = jest.fn(async () => [{ table: 'beds', rows: 342 }, { table: 'properties', rows: 0 }]);
  const controller = new AdminController({ execute, countRows } as any);
  jest.spyOn((controller as any).logger, 'warn').mockImplementation(() => undefined);
  return { controller, execute, countRows };
}

/** Mirrors how Nest resolves @Roles at request time, so the metadata is actually exercised. */
const roleAllowed = (handler: any, role: string) => {
  const guard = new RolesGuard(new Reflector());
  const ctx: any = {
    getHandler: () => handler,
    getClass: () => AdminController,
    switchToHttp: () => ({ getRequest: () => ({ auth: { userId: 'u1', role } }) }),
  };
  try {
    return guard.canActivate(ctx);
  } catch {
    return false;
  }
};

describe('AdminController', () => {
  it('empties the database when the confirmation phrase is right', async () => {
    const { controller, execute } = build();
    const actor = { userId: 'user_1', role: 'sysadmin' };
    const res = await controller.reset(RESET_CONFIRMATION, actor);
    expect(execute).toHaveBeenCalledWith(actor);
    expect(res.message).toContain('342 rows');
  });

  // The phrase is the last thing between a stray request and an unrecoverable wipe.
  it.each([undefined, '', 'yes', 'delete everything', { confirm: RESET_CONFIRMATION }])(
    'refuses to wipe anything when confirmation is %p',
    async (confirm) => {
      const { controller, execute } = build();
      await expect(controller.reset(confirm as any)).rejects.toBeInstanceOf(BadRequestException);
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it('is reachable by sysadmin alone', () => {
    const handler = AdminController.prototype.reset;
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['sysadmin']);
    expect(roleAllowed(handler, 'sysadmin')).toBe(true);
    // Manager runs the rest of the application and still must not reach this.
    for (const role of ['manager', 'administrator', 'staff', 'resident', undefined]) {
      expect(roleAllowed(handler, role as string)).toBe(false);
    }
  });

  it('reports what a reset would destroy without destroying it', async () => {
    const { controller, execute } = build();
    const res = await controller.databaseContents();
    expect(res.rowsTotal).toBe(342);
    expect(res.tables).toHaveLength(2);
    expect(execute).not.toHaveBeenCalled();
  });

  it('keeps the preview to sysadmin too — the row counts are themselves a disclosure', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminController.prototype.databaseContents)).toEqual(['sysadmin']);
  });
});
