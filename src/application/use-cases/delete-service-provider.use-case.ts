import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IServiceProviderRepository, SERVICE_PROVIDER_REPOSITORY } from '../../domain/service-provider/service-provider.repository';

@Injectable()
export class DeleteServiceProviderUseCase {
  constructor(@Inject(SERVICE_PROVIDER_REPOSITORY) private readonly repo: IServiceProviderRepository) {}

  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`ServiceProvider ${id} not found`);
    await this.repo.delete(id);
  }
}
