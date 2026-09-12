import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { DepositTransactionsController } from './deposit-transactions.controller';

function contextWithRole(role: string | undefined, handlerName: keyof DepositTransactionsController) {
  const handler = DepositTransactionsController.prototype[handlerName];
  return {
    getHandler: () => handler,
    getClass: () => DepositTransactionsController,
    switchToHttp: () => ({ getRequest: () => ({ auth: role ? { userId: 'u1', role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('DepositTransactionsController RBAC — refund queue routes', () => {
  const guard = new RolesGuard(new Reflector());
  const routes: (keyof DepositTransactionsController)[] = ['refundQueue', 'completeDepositRefund'];

  it.each(routes)('allows sysadmin, manager, administrator on %s', (route) => {
    for (const role of ['sysadmin', 'manager', 'administrator']) {
      expect(guard.canActivate(contextWithRole(role, route))).toBe(true);
    }
  });

  it.each(routes)('rejects staff and maintenance on %s (Finance/Administration only)', (route) => {
    for (const role of ['staff', 'maintenance']) {
      expect(() => guard.canActivate(contextWithRole(role, route))).toThrow(ForbiddenException);
    }
  });
});
