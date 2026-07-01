import { Inject, Injectable } from '@nestjs/common';
import { IServiceProviderRepository, SERVICE_PROVIDER_REPOSITORY } from '../../domain/service-provider/service-provider.repository';

@Injectable()
export class GetServiceProvidersUseCase {
  constructor(@Inject(SERVICE_PROVIDER_REPOSITORY) private readonly repo: IServiceProviderRepository) {}
  async execute() { return this.repo.findAll(); }
}
