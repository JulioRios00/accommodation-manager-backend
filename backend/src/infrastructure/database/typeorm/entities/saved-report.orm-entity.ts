import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('saved_reports')
export class SavedReportOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 200 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ length: 50 }) entityType: string;
  @Column({ type: 'jsonb' }) fieldMetadata: any;
  @Column('uuid') createdBy: string;
  @Column({ length: 50, nullable: true }) createdByName: string;
  @Column({ default: false }) isPublic: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
