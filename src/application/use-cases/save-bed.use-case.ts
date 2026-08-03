import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bed } from '../../domain/bed/bed.entity';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IBedroomRepository, BEDROOM_REPOSITORY } from '../../domain/bedroom/bedroom.repository';

export interface SaveBedDto {
  id?: string;
  propertyId: string;
  bedNumber: number;
  bedroomId?: string | null;
  name?: string | null;
  position?: number | null;
  status?: string;
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
    @Inject(BEDROOM_REPOSITORY) private readonly bedroomRepo: IBedroomRepository,
  ) {}

  async execute(dto: SaveBedDto): Promise<Bed> {
    if (dto.rentAmount !== undefined && dto.rentAmount < 0) {
      throw new BadRequestException('rentAmount must be >= 0');
    }
    if (dto.depositAmount !== undefined && dto.depositAmount < 0) {
      throw new BadRequestException('depositAmount must be >= 0');
    }
    if (dto.bedroomId) {
      const bedroom = await this.bedroomRepo.findById(dto.bedroomId);
      if (!bedroom) throw new NotFoundException(`Bedroom ${dto.bedroomId} not found`);
      if (bedroom.propertyId !== dto.propertyId) {
        throw new BadRequestException('Bedroom does not belong to this property');
      }
    }
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Bed ${dto.id} not found`);
      return this.repo.save(dto as any);
    }
    return this.repo.save({ ...dto, status: 'vacant' } as any);
  }
}
