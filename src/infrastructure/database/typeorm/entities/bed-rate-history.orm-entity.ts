import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bed_rate_history')
export class BedRateHistoryOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) bedId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) rentAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) depositAmount: number;
  @Index() @Column({ type: 'timestamptz' }) effectiveFrom: Date;
  @CreateDateColumn() createdAt: Date;
}
