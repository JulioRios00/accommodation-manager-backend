import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { RentPaymentsController } from './rent-payments.controller';

function contextWithRole(role: string | undefined, handlerName: keyof RentPaymentsController) {
  const handler = RentPaymentsController.prototype[handlerName];
  return {
    getHandler: () => handler,
    getClass: () => RentPaymentsController,
    switchToHttp: () => ({ getRequest: () => ({ auth: role ? { userId: 'u1', role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('RentPaymentsController RBAC — mark-received', () => {
  const guard = new RolesGuard(new Reflector());

  it.each(['sysadmin', 'manager', 'administrator', 'staff'])('allows role "%s"', (role) => {
    expect(guard.canActivate(contextWithRole(role, 'markAsReceived'))).toBe(true);
  });

  it.each(['maintenance', 'resident', undefined])('rejects role "%s" with 403', (role) => {
    expect(() => guard.canActivate(contextWithRole(role, 'markAsReceived'))).toThrow(ForbiddenException);
  });
});
