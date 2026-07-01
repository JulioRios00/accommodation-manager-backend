import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('deposit_transactions')
export class DepositTransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 20 }) type: string;
  @Column('uuid') residentId: string;
  @Column({ type: 'uuid', nullable: true }) bookingId: string;
  @Column('uuid') propertyId: string;
  @Column({ type: 'uuid', nullable: true }) bedId: string;
  @Column({ length: 200 }) residentName: string;
  @Column({ type: 'date', nullable: true }) checkoutDate: Date;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) depositAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) proRataRentAmount: number;
  @Column({ length: 50, nullable: true }) iban: string;
  @Column({ type: 'text', nullable: true }) payeeAddress: string;
  @Column({ length: 20, default: 'pending' }) status: string;
  @Column({ type: 'date', nullable: true }) dateProcessed: Date;
  @Column({ length: 100, nullable: true }) bankReference: string;
  @Column({ length: 100, nullable: true }) company: string;
  @Column({ type: 'text', nullable: true }) comments: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
