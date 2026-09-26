import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { LandlordPaymentsController } from './landlord-payments.controller';

function contextWithRole(role: string | undefined, handlerName: keyof LandlordPaymentsController) {
  const handler = LandlordPaymentsController.prototype[handlerName];
  return {
    getHandler: () => handler,
    getClass: () => LandlordPaymentsController,
    switchToHttp: () => ({ getRequest: () => ({ auth: role ? { userId: 'u1', role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('LandlordPaymentsController RBAC — disbursement routes', () => {
  const guard = new RolesGuard(new Reflector());
  const routes: (keyof LandlordPaymentsController)[] = ['ledger', 'setNotes', 'markAsPaid', 'export'];

  it.each(routes)('allows sysadmin on %s', (route) => {
    expect(guard.canActivate(contextWithRole('sysadmin', route))).toBe(true);
  });

  it.each(routes)('allows manager on %s', (route) => {
    expect(guard.canActivate(contextWithRole('manager', route))).toBe(true);
  });

  it.each(routes)('rejects administrator on %s (Management/SysAdmin only)', (route) => {
    expect(() => guard.canActivate(contextWithRole('administrator', route))).toThrow(ForbiddenException);
  });

  it.each(routes)('rejects staff on %s', (route) => {
    expect(() => guard.canActivate(contextWithRole('staff', route))).toThrow(ForbiddenException);
  });
});
