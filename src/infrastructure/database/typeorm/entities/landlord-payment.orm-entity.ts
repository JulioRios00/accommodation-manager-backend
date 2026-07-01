import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('landlord_payments')
export class LandlordPaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') propertyId: string;
  @Column('uuid') landlordId: string;
  @Column({ length: 7 }) month: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amountDue: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) amountPaid: number;
  @Column({ type: 'date', nullable: true }) dateDue: Date;
  @Column({ type: 'date', nullable: true }) datePaid: Date;
  @Column({ length: 200, nullable: true }) beneficiaryName: string;
  @Column({ length: 50, nullable: true }) iban: string;
  @Column({ length: 20, nullable: true }) bic: string;
  @Column({ length: 100, nullable: true }) paymentReference: string;
  @Column({ length: 50, nullable: true }) paymentMethod: string;
  @Column({ length: 20, default: 'pending' }) status: string;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
