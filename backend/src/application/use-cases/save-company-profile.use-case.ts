import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import {
  COMPANY_PROFILE_REPOSITORY,
  ICompanyProfileRepository,
} from '../../domain/company-profile/company-profile.repository';
import {
  isAllowedLogoDataUrl,
  MAX_LOGO_DATA_URL_LENGTH,
} from '../../domain/company-profile/company-profile.entity';

export class SaveCompanyProfileDto {
  @IsString()
  @MinLength(1, { message: 'appName must not be empty' })
  @MaxLength(60)
  appName: string;

  /** null clears the logo. ValidateIf rather than IsOptional so an explicit null is
   *  allowed through while a non-null value is still checked. */
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  @MaxLength(MAX_LOGO_DATA_URL_LENGTH, { message: 'Logo is too large (max ~384KB of image data)' })
  logoDataUrl?: string | null;
}

@Injectable()
export class SaveCompanyProfileUseCase {
  constructor(@Inject(COMPANY_PROFILE_REPOSITORY) private readonly repo: ICompanyProfileRepository) {}

  async execute(dto: SaveCompanyProfileDto) {
    const appName = dto.appName.trim();
    if (!appName) throw new BadRequestException('appName must not be empty');

    const logoDataUrl = dto.logoDataUrl ?? null;
    // Checked here rather than with a decorator so the rule lives next to the
    // allow-list it enforces: the shell renders this straight into an <img src>.
    if (logoDataUrl !== null && !isAllowedLogoDataUrl(logoDataUrl)) {
      throw new BadRequestException('Logo must be a base64 PNG, JPEG, SVG or WebP data URL');
    }

    return this.repo.save({ appName, logoDataUrl });
  }
}
