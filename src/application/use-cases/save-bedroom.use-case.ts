import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bedroom } from '../../domain/bedroom/bedroom.entity';
import { IBedroomRepository, BEDROOM_REPOSITORY } from '../../domain/bedroom/bedroom.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';

export interface SaveBedroomDto {
  id?: string;
  propertyId: string;
  name: string;
}

@Injectable()
export class SaveBedroomUseCase {
  constructor(
    @Inject(BEDROOM_REPOSITORY) private readonly repo: IBedroomRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
  ) {}

  async execute(dto: SaveBedroomDto): Promise<Bedroom> {
    const trimmedName = (dto.name ?? '').trim();
    if (!trimmedName) throw new BadRequestException('Bedroom name cannot be blank');

    const property = await this.propertyRepo.findById(dto.propertyId);
    if (!property) throw new NotFoundException(`Property ${dto.propertyId} not found`);

    const duplicate = await this.repo.findByPropertyAndName(dto.propertyId, trimmedName);
    if (duplicate && duplicate.id !== dto.id) {
      throw new ConflictException(`A bedroom named "${trimmedName}" already exists in this property`);
    }

    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Bedroom ${dto.id} not found`);
      return this.repo.save({ ...dto, name: trimmedName } as any);
    }
    return this.repo.save({ ...dto, name: trimmedName, active: true } as any);
  }
}
