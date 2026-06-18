import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bed } from '../../domain/bed/bed.entity';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';

export interface SaveBedDto {
  id?: string;
  propertyId: string;
  bedNumber: number;
  bedroomType: string;
  sex: string;
  bedSize: string;
  depositAmount?: number;
  rentAmount?: number;
}

@Injectable()
export class SaveBedUseCase {
  constructor(
    @Inject(BED_REPOSITORY) private readonly repo: IBedRepository,
  ) {}

  async execute(dto: SaveBedDto): Promise<Bed> {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Bed ${dto.id} not found`);
    }
    return this.repo.save(dto);
  }
}
