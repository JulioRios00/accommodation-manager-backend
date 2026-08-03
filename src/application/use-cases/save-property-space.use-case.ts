import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PropertySpace } from '../../domain/property-space/property-space.entity';
import { IPropertySpaceRepository, PROPERTY_SPACE_REPOSITORY } from '../../domain/property-space/property-space.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';

export interface SavePropertySpaceDto {
  id?: string;
  propertyId: string;
  category: string;
  name: string;
}

@Injectable()
export class SavePropertySpaceUseCase {
  constructor(
    @Inject(PROPERTY_SPACE_REPOSITORY) private readonly repo: IPropertySpaceRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
  ) {}

  async execute(dto: SavePropertySpaceDto): Promise<PropertySpace> {
    const trimmedName = (dto.name ?? '').trim();
    if (!trimmedName) throw new BadRequestException('Space name cannot be blank');
    if (!dto.category) throw new BadRequestException('Space category is required');

    const property = await this.propertyRepo.findById(dto.propertyId);
    if (!property) throw new NotFoundException(`Property ${dto.propertyId} not found`);

    const existing = (await this.repo.findAll(dto.propertyId))
      .find(s => s.name.toLowerCase() === trimmedName.toLowerCase() && s.id !== dto.id);
    if (existing) throw new ConflictException(`A space named "${trimmedName}" already exists in this property`);

    if (dto.id) {
      const found = await this.repo.findById(dto.id);
      if (!found) throw new NotFoundException(`Space ${dto.id} not found`);
    }

    return this.repo.save({
      ...dto,
      name: trimmedName,
      ...(dto.id ? {} : { active: true }),
    } as any);
  }
}
