import { KeyLog } from './key-log.entity';

export const KEY_LOG_REPOSITORY = 'KEY_LOG_REPOSITORY';

export interface IKeyLogRepository {
  findAll(propertyId?: string): Promise<KeyLog[]>;
  findById(id: string): Promise<KeyLog | null>;
  save(log: Partial<KeyLog>): Promise<KeyLog>;
  delete(id: string): Promise<void>;
}
