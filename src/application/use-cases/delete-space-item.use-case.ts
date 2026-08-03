import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ISpaceItemRepository, SPACE_ITEM_REPOSITORY } from '../../domain/property-space/property-space.repository';

@Injectable()
export class DeleteSpaceItemUseCase {
  constructor(@Inject(SPACE_ITEM_REPOSITORY) private readonly repo: ISpaceItemRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Item ${id} not found`);
    await this.repo.delete(id);
  }
}
