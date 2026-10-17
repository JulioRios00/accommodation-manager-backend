import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CompanyProfile,
  COMPANY_PROFILE_ID,
  DEFAULT_APP_NAME,
} from '../../../../domain/company-profile/company-profile.entity';
import { ICompanyProfileRepository } from '../../../../domain/company-profile/company-profile.repository';
import { CompanyProfileOrmEntity } from '../entities/company-profile.orm-entity';

@Injectable()
export class CompanyProfileTypeOrmRepository implements ICompanyProfileRepository {
  constructor(
    @InjectRepository(CompanyProfileOrmEntity)
    private readonly repo: Repository<CompanyProfileOrmEntity>,
  ) {}

  async get(): Promise<CompanyProfile> {
    const e = await this.repo.findOne({ where: { id: COMPANY_PROFILE_ID } });
    // Never 404 — every authenticated user reads this to render the shell, so an
    // untouched deployment has to return the built-in defaults rather than an error.
    if (!e) {
      const d = new CompanyProfile();
      d.id = COMPANY_PROFILE_ID;
      d.appName = DEFAULT_APP_NAME;
      d.logoDataUrl = null;
      d.updatedAt = new Date(0);
      return d;
    }
    return this.toDomain(e);
  }

  async save(profile: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const existing = await this.repo.findOne({ where: { id: COMPANY_PROFILE_ID } });
    const merged = this.repo.merge(
      existing ?? this.repo.create({ id: COMPANY_PROFILE_ID, appName: DEFAULT_APP_NAME, logoDataUrl: null }),
      { ...profile, id: COMPANY_PROFILE_ID },
    );
    return this.toDomain(await this.repo.save(merged));
  }

  private toDomain(e: CompanyProfileOrmEntity): CompanyProfile {
    const d = new CompanyProfile();
    d.id = e.id;
    d.appName = e.appName;
    d.logoDataUrl = e.logoDataUrl ?? null;
    d.updatedAt = e.updatedAt;
    return d;
  }
}
