import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('landlords')
export class LandlordOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 200 }) name: string;
  @Column({ length: 200, nullable: true }) email: string;
  @Column({ type: 'text', nullable: true }) address: string;
  @Column({ length: 100, nullable: true }) bankName: string;
  @Column({ length: 20, nullable: true }) sortCode: string;
  @Column({ length: 50, nullable: true }) accountNumber: string;
  @Column({ length: 50, nullable: true }) iban: string;
  @Column({ length: 20, nullable: true }) bic: string;
  @Column({ length: 100, nullable: true }) paymentReference: string;
  @Column({ length: 50, nullable: true }) paymentMethod: string;
  @Column({ type: 'int', nullable: true }) payoutDay: number;
  @Column({ type: 'int', nullable: true }) residentPaymentDueDay: number;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
