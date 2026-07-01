import { Inject, Injectable } from '@nestjs/common';
import { IKeyLogRepository, KEY_LOG_REPOSITORY } from '../../domain/key-log/key-log.repository';

@Injectable()
export class GetKeyLogsUseCase {
  constructor(@Inject(KEY_LOG_REPOSITORY) private readonly repo: IKeyLogRepository) {}
  async execute(propertyId?: string) { return this.repo.findAll(propertyId); }
}
