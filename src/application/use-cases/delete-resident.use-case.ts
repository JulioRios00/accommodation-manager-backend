import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';

@Injectable()
export class DeleteResidentUseCase {
  constructor(
    @Inject(RESIDENT_REPOSITORY) private readonly repo: IResidentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Resident ${id} not found`);
    await this.repo.delete(id);
  }
}
