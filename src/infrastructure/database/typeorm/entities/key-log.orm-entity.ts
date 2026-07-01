import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('key_logs')
export class KeyLogOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') propertyId: string;
  @Column({ type: 'uuid', nullable: true }) bedId: string;
  @Column({ length: 30 }) keyType: string;
  @Column({ length: 200 }) takenBy: string;
  @Column({ length: 30 }) takenByType: string;
  @Column({ type: 'timestamptz' }) takenAt: Date;
  @Column({ type: 'date', nullable: true }) expectedReturnAt: Date;
  @Column({ type: 'date', nullable: true }) actualReturnAt: Date;
  @Column({ length: 20, default: 'out' }) returnStatus: string;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
