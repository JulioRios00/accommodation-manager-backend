import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IBedroomRepository, BEDROOM_REPOSITORY } from '../../domain/bedroom/bedroom.repository';

@Injectable()
export class DeleteBedroomUseCase {
  constructor(@Inject(BEDROOM_REPOSITORY) private readonly repo: IBedroomRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Bedroom ${id} not found`);
    await this.repo.delete(id);
  }
}
