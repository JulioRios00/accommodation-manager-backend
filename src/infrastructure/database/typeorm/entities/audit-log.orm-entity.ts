import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditAction, AuditFieldChange } from '../../../../domain/audit-log/audit-log.entity';

@Entity('audit_logs')
export class AuditLogOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'varchar', length: 100 }) userId: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) userRole: string;
  @Column({ type: 'varchar', length: 10 }) action: AuditAction;
  @Index() @Column({ length: 50 }) entityType: string;
  @Index() @Column({ type: 'uuid' }) entityId: string;
  @Column({ type: 'jsonb', default: [] }) changes: AuditFieldChange[];
  @Index() @CreateDateColumn() createdAt: Date;
}
