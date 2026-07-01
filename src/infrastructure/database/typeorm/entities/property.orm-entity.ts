import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BedOrmEntity } from './bed.orm-entity';

@Entity('properties')
export class PropertyOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  code: string;

  @Column({ length: 20 })
  bu: string;

  @Column({ length: 100, nullable: true })
  area: string;

  @Column({ type: 'text', nullable: true })
  fullAddress: string;

  // officeKeys (boolean) kept in ORM only so synchronize does not alter the existing column.
  // The domain model uses officeKeysCount instead.
  @Column({ default: false })
  officeKeys: boolean;

  @Column({ default: 0 })
  officeKeysCount: number;

  @Column({ default: 0 })
  keysCount: number;

  @Column({ default: 0 })
  securityKeysCount: number;

  @Column({ default: 0 })
  fobCount: number;

  @Column({ length: 50, nullable: true })
  keyCode: string;

  // Electricity
  @Column({ length: 20, nullable: true })
  electricityStatus: string;

  @Column({ length: 50, nullable: true })
  electricityMprn: string;

  @Column({ length: 100, nullable: true })
  electricitySupplier: string;

  @Column({ length: 100, nullable: true })
  electricityAccountNumber: string;

  @Column({ length: 100, nullable: true })
  electricityKeypadCode: string;

  // Gas
  @Column({ length: 20, nullable: true })
  gasStatus: string;

  @Column({ length: 50, nullable: true })
  gasGprn: string;

  @Column({ length: 100, nullable: true })
  gasSupplier: string;

  @Column({ length: 100, nullable: true })
  gasAccountNumber: string;

  @Column({ length: 100, nullable: true })
  gasPin: string;

  // Waste / Bin
  @Column({ length: 100, nullable: true })
  wasteSupplier: string;

  @Column({ length: 100, nullable: true })
  wasteAccountNumber: string;

  @Column({ length: 200, nullable: true })
  wasteEmail: string;

  @Column({ length: 100, nullable: true })
  wastePassword: string;

  @Column({ length: 50, nullable: true })
  wastePaymentType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  wasteMonthlyAmount: number;

  @Column({ length: 50, nullable: true })
  wasteStatus: string;

  // Internet
  @Column({ length: 100, nullable: true })
  internetSupplier: string;

  @Column({ length: 100, nullable: true })
  internetAccountNumber: string;

  @Column({ length: 200, nullable: true })
  internetEmail: string;

  @Column({ length: 100, nullable: true })
  internetUsername: string;

  @Column({ length: 100, nullable: true })
  internetPassword: string;

  @Column({ length: 50, nullable: true })
  internetPaymentType: string;

  @Column({ length: 50, nullable: true })
  internetStatus: string;

  @Column({ type: 'date', nullable: true })
  internetContractEndDate: Date;

  // Sales
  @Column({ type: 'text', nullable: true })
  salesDescription: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BedOrmEntity, (bed) => bed.property)
  beds: BedOrmEntity[];
}
