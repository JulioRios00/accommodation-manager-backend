import { Body, Controller, Get, Put, ValidationPipe } from '@nestjs/common';
import { GetCompanyProfileUseCase } from '../../application/use-cases/get-company-profile.use-case';
import {
  SaveCompanyProfileDto,
  SaveCompanyProfileUseCase,
} from '../../application/use-cases/save-company-profile.use-case';
import { Roles } from '../decorators/roles.decorator';

const savePipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('company-profile')
export class CompanyProfileController {
  constructor(
    private readonly getProfile: GetCompanyProfileUseCase,
    private readonly saveProfile: SaveCompanyProfileUseCase,
  ) {}

  /** Deliberately open to every authenticated role — the sidebar renders this on
   *  every page, so gating it would blank the branding for most of the app. */
  @Get()
  async find() {
    return this.getProfile.execute();
  }

  @Put()
  @Roles('sysadmin')
  async update(@Body(savePipe) dto: SaveCompanyProfileDto) {
    return this.saveProfile.execute(dto);
  }
}
