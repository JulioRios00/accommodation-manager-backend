import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPropertySpaceRepository, PROPERTY_SPACE_REPOSITORY, ISpaceItemRepository, SPACE_ITEM_REPOSITORY } from '../../domain/property-space/property-space.repository';

@Injectable()
export class DeletePropertySpaceUseCase {
  constructor(
    @Inject(PROPERTY_SPACE_REPOSITORY) private readonly repo: IPropertySpaceRepository,
    @Inject(SPACE_ITEM_REPOSITORY) private readonly itemRepo: ISpaceItemRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Space ${id} not found`);
    await this.itemRepo.deleteBySpaceId(id);
    await this.repo.delete(id);
  }
}
