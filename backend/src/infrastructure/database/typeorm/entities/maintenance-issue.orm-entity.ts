import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('maintenance_issues')
export class MaintenanceIssueOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  ticketId: string;

  @Column('text')
  title: string;

  @Column('text', { nullable: true })
  category: string | null;

  @Column('text')
  status: string;

  @Column('text', { nullable: true })
  descriptionRequested: string | null;

  @Column('text', { nullable: true })
  descriptionDone: string | null;

  @Column('uuid', { nullable: true })
  assignedTo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
