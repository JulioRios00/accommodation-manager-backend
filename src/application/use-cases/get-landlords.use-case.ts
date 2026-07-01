import { Inject, Injectable } from '@nestjs/common';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';

@Injectable()
export class GetLandlordsUseCase {
  constructor(@Inject(LANDLORD_REPOSITORY) private readonly repo: ILandlordRepository) {}
  async execute() { return this.repo.findAll(); }
}
