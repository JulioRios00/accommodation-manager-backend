import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IServiceProviderRepository, SERVICE_PROVIDER_REPOSITORY } from '../../domain/service-provider/service-provider.repository';

export interface SaveServiceProviderDto {
  id?: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  notes?: string | null;
}

@Injectable()
export class SaveServiceProviderUseCase {
  constructor(@Inject(SERVICE_PROVIDER_REPOSITORY) private readonly repo: IServiceProviderRepository) {}

  async execute(dto: SaveServiceProviderDto) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`ServiceProvider ${dto.id} not found`);
    }
    return this.repo.save(dto);
  }
}
