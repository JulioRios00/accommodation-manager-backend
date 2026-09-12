import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { FeatureFlagService } from '../../application/services/feature-flag.service';
import { Roles } from '../decorators/roles.decorator';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  /** Readable by any signed-in user — the frontend gates its own nav/tabs on this,
   *  the same way GET /role-permissions works. */
  @Get()
  async findAll() {
    return this.featureFlags.listAll();
  }

  @Put(':key')
  @Roles('sysadmin', 'manager')
  async update(@Param('key') key: string, @Body('enabled') enabled: boolean) {
    return this.featureFlags.setEnabled(key, !!enabled);
  }
}
