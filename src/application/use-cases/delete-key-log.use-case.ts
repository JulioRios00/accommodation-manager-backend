import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IKeyLogRepository, KEY_LOG_REPOSITORY } from '../../domain/key-log/key-log.repository';

@Injectable()
export class DeleteKeyLogUseCase {
  constructor(@Inject(KEY_LOG_REPOSITORY) private readonly repo: IKeyLogRepository) {}

  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`KeyLog ${id} not found`);
    await this.repo.delete(id);
  }
}
