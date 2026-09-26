import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { CustomReportsController } from './custom-reports.controller';

// Builds a minimal ExecutionContext carrying the given role, targeting the controller's
// real decorator metadata — exercises the exact mechanism the live API uses, without
// needing a running server/DB.
function contextWithRole(role: string | undefined, handlerName: keyof CustomReportsController = 'listEntities') {
  const handler = CustomReportsController.prototype[handlerName];
  return {
    getHandler: () => handler,
    getClass: () => CustomReportsController,
    switchToHttp: () => ({ getRequest: () => ({ auth: role ? { userId: 'u1', role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('CustomReportsController RBAC', () => {
  const guard = new RolesGuard(new Reflector());

  it.each(['sysadmin', 'manager'])('allows role "%s"', (role) => {
    expect(guard.canActivate(contextWithRole(role))).toBe(true);
  });

  it.each(['administrator', 'staff', 'maintenance', 'resident', undefined])(
    'rejects role "%s" with 403',
    (role) => {
      expect(() => guard.canActivate(contextWithRole(role))).toThrow(ForbiddenException);
    },
  );

  it('applies the restriction to every route on the controller (class-level @Roles)', () => {
    const routes: (keyof CustomReportsController)[] = ['listEntities', 'listFields', 'preview', 'exportPdf', 'exportXlsx'];
    for (const route of routes) {
      expect(() => guard.canActivate(contextWithRole('staff', route))).toThrow(ForbiddenException);
    }
  });
});
