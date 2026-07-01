import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rent_payments')
export class RentPaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') residentId: string;
  @Column('uuid') bookingId: string;
  @Column('uuid') propertyId: string;
  @Column({ length: 7 }) month: string;
  @Column({ type: 'int', nullable: true }) paymentDueDay: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) rentAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) amountPaid: number;
  @Column({ length: 30, default: 'on_time' }) lateStatus: string;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('rent_payment_installments')
export class RentPaymentInstallmentOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') rentPaymentId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'date' }) paidAt: Date;
  @Column({ type: 'text', nullable: true }) notes: string;
  @CreateDateColumn() createdAt: Date;
}
