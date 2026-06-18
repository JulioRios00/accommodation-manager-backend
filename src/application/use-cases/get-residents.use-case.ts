import { Inject, Injectable } from '@nestjs/common';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { Resident } from '../../domain/resident/resident.entity';

@Injectable()
export class GetResidentsUseCase {
  constructor(
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
  ) {}

  async execute(): Promise<Resident[]> {
    return this.residentRepo.findAll();
  }
}
