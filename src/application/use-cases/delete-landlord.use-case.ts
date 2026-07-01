import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';

@Injectable()
export class DeleteLandlordUseCase {
  constructor(@Inject(LANDLORD_REPOSITORY) private readonly repo: ILandlordRepository) {}

  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Landlord ${id} not found`);
    await this.repo.delete(id);
  }
}
