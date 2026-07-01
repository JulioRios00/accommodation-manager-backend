import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Resident } from '../../domain/resident/resident.entity';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';

export interface SaveResidentDto {
  id?: string;
  fullName: string;
  email?: string | null;
  telephone?: string | null;
  nationality?: string | null;
  personalId?: string | null;
  iban?: string | null;
  emergencyContact?: string | null;
  source?: string | null;
  paymentDueDay?: number | null;
  comments?: string | null;
  delinquent?: boolean;
  hasObservation?: boolean;
  observation?: string | null;
}

@Injectable()
export class SaveResidentUseCase {
  constructor(
    @Inject(RESIDENT_REPOSITORY) private readonly repo: IResidentRepository,
  ) {}

  async execute(dto: SaveResidentDto): Promise<Resident> {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Resident ${dto.id} not found`);
    }
    return this.repo.save(dto);
  }
}
