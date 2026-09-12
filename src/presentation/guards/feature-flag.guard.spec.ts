import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagGuard } from './feature-flag.guard';
import { RequireFeatureFlag } from '../decorators/require-feature-flag.decorator';

class DummyController {
  @RequireFeatureFlag('landlord_disbursements')
  gated() {}

  ungated() {}
}

function contextFor(handlerName: keyof DummyController): ExecutionContext {
  const handler = DummyController.prototype[handlerName];
  return {
    getHandler: () => handler,
    getClass: () => DummyController,
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('FeatureFlagGuard', () => {
  it('allows a route with no @RequireFeatureFlag metadata', async () => {
    const featureFlags = { isEnabled: jest.fn() } as any;
    const guard = new FeatureFlagGuard(new Reflector(), featureFlags);
    expect(await guard.canActivate(contextFor('ungated'))).toBe(true);
    expect(featureFlags.isEnabled).not.toHaveBeenCalled();
  });

  it('allows a gated route when the flag is enabled', async () => {
    const featureFlags = { isEnabled: jest.fn(async () => true) } as any;
    const guard = new FeatureFlagGuard(new Reflector(), featureFlags);
    expect(await guard.canActivate(contextFor('gated'))).toBe(true);
    expect(featureFlags.isEnabled).toHaveBeenCalledWith('landlord_disbursements');
  });

  it('rejects a gated route when the flag is disabled', async () => {
    const featureFlags = { isEnabled: jest.fn(async () => false) } as any;
    const guard = new FeatureFlagGuard(new Reflector(), featureFlags);
    await expect(guard.canActivate(contextFor('gated'))).rejects.toThrow(ForbiddenException);
  });
});
