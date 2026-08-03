import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SpaceItem } from '../../domain/property-space/property-space.entity';
import { IPropertySpaceRepository, PROPERTY_SPACE_REPOSITORY, ISpaceItemRepository, SPACE_ITEM_REPOSITORY } from '../../domain/property-space/property-space.repository';

export interface SaveSpaceItemDto {
  id?: string;
  spaceId: string;
  name: string;
  quantity?: number;
  condition?: string | null;
  notes?: string | null;
}

@Injectable()
export class SaveSpaceItemUseCase {
  constructor(
    @Inject(SPACE_ITEM_REPOSITORY) private readonly repo: ISpaceItemRepository,
    @Inject(PROPERTY_SPACE_REPOSITORY) private readonly spaceRepo: IPropertySpaceRepository,
  ) {}

  async execute(dto: SaveSpaceItemDto): Promise<SpaceItem> {
    const trimmedName = (dto.name ?? '').trim();
    if (!trimmedName) throw new BadRequestException('Item name cannot be blank');

    const space = await this.spaceRepo.findById(dto.spaceId);
    if (!space) throw new NotFoundException(`Space ${dto.spaceId} not found`);

    if (dto.id) {
      const found = await this.repo.findById(dto.id);
      if (!found) throw new NotFoundException(`Item ${dto.id} not found`);
    }

    return this.repo.save({
      ...dto,
      name: trimmedName,
      quantity: dto.quantity ?? 1,
      ...(dto.id ? {} : { active: true }),
    } as any);
  }
}
