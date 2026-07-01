import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('checkout_records')
export class CheckoutRecordOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') bookingId: string;
  @Column({ type: 'date' }) checkoutDate: Date;
  @Column({ default: false }) keysReturned: boolean;
  @Column({ type: 'text', nullable: true }) inspectionNotes: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) depositRefundAmount: number;
  @Column({ length: 50, nullable: true }) refundIban: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) proRataRentAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) proRataAdjustment: number;
  @Column({ default: false }) newResidentLinked: boolean;
  @Column({ type: 'uuid', nullable: true }) newResidentId: string;
  @Column({ length: 100, nullable: true }) processedBy: string;
  @Column({ length: 200, nullable: true }) processedByName: string;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
