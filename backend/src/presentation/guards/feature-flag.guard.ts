import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY } from '../decorators/require-feature-flag.decorator';
import { FeatureFlagKey } from '../../domain/feature-flag/feature-flag.entity';
import { FeatureFlagService } from '../../application/services/feature-flag.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<FeatureFlagKey | undefined>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!key) return true; // route doesn't gate on a flag — unaffected

    const enabled = await this.featureFlags.isEnabled(key);
    if (!enabled) throw new ForbiddenException(`This feature is currently disabled ("${key}")`);
    return true;
  }
}
