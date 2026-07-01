import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 50 }) entityType: string;
  @Column('uuid') entityId: string;
  @Column({ length: 100, nullable: true }) field: string;
  @Column({ type: 'text', nullable: true }) oldValue: string;
  @Column({ type: 'text', nullable: true }) newValue: string;
  @Column({ length: 100, nullable: true }) clerkUserId: string;
  @Column({ length: 200, nullable: true }) clerkUserName: string;
  @CreateDateColumn() createdAt: Date;
}
