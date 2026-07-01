import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IKeyLogRepository, KEY_LOG_REPOSITORY } from '../../domain/key-log/key-log.repository';

export interface SaveKeyLogDto {
  id?: string;
  propertyId: string;
  bedId?: string | null;
  keyType: string;
  takenBy: string;
  takenByType: string;
  takenAt?: string | Date;
  expectedReturnAt?: string | null;
  actualReturnAt?: string | null;
  returnStatus?: string;
  notes?: string | null;
}

@Injectable()
export class SaveKeyLogUseCase {
  constructor(@Inject(KEY_LOG_REPOSITORY) private readonly repo: IKeyLogRepository) {}

  async execute(dto: SaveKeyLogDto) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`KeyLog ${dto.id} not found`);
    }
    return this.repo.save({ ...dto, returnStatus: dto.returnStatus ?? 'out' } as any);
  }
}
