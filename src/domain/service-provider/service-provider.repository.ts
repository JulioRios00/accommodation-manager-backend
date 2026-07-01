import { ServiceProvider } from './service-provider.entity';

export const SERVICE_PROVIDER_REPOSITORY = 'SERVICE_PROVIDER_REPOSITORY';

export interface IServiceProviderRepository {
  findAll(): Promise<ServiceProvider[]>;
  findById(id: string): Promise<ServiceProvider | null>;
  save(sp: Partial<ServiceProvider>): Promise<ServiceProvider>;
  delete(id: string): Promise<void>;
}
