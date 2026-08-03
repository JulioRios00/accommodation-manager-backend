import { Inject, Injectable } from '@nestjs/common';
import { IBedroomRepository, BEDROOM_REPOSITORY } from '../../domain/bedroom/bedroom.repository';

@Injectable()
export class GetBedroomsUseCase {
  constructor(@Inject(BEDROOM_REPOSITORY) private readonly repo: IBedroomRepository) {}
  async execute(propertyId?: string) { return this.repo.findAll(propertyId); }
}
