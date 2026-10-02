import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('error_logs')
@Index(['severity'])
@Index(['context'])
@Index(['resolved'])
@Index(['lastOccurred'])
export class ErrorLogOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('text')
  message: string;

  @Column('text', { nullable: true })
  stack: string | null;

  @Column('text')
  severity: 'critical' | 'error' | 'warning' | 'info';

  @Column('text')
  context: string;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @Column('text', { nullable: true })
  userName: string | null;

  @Column('integer', { nullable: true })
  statusCode: number | null;

  @Column('text', { nullable: true })
  url: string | null;

  @Column('text', { nullable: true })
  method: string | null;

  @Column('boolean', { default: false })
  resolved: boolean;

  @Column('timestamp', { nullable: true })
  resolvedAt: Date | null;

  @Column('uuid', { nullable: true })
  resolvedBy: string | null;

  @Column('text', { nullable: true })
  notes: string | null;

  @Column('integer', { default: 1 })
  count: number;

  @Column('timestamp')
  lastOccurred: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
