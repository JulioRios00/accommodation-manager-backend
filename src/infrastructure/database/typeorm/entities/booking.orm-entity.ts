import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BedOrmEntity } from './bed.orm-entity';
import { ResidentOrmEntity } from './resident.orm-entity';

export type BookingStatus = 'active' | 'upcoming' | 'completed';

@Entity('bookings')
export class BookingOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bedId: string;

  @Column()
  residentId: string;

  @Column({ type: 'date', nullable: true })
  checkInDate: Date;

  @Column({ type: 'date', nullable: true })
  contractEndDate: Date;

  @Column({ type: 'date', nullable: true })
  checkOutDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  rentAmount: number;

  @Column({ default: false })
  isHeadResident: boolean;

  @Column({ default: false })
  isTemporary: boolean;

  @Column({ type: 'enum', enum: ['active', 'upcoming', 'completed'], default: 'active' })
  status: BookingStatus;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => BedOrmEntity, (bed) => bed.bookings)
  bed: BedOrmEntity;

  @ManyToOne(() => ResidentOrmEntity, (resident) => resident.bookings)
  resident: ResidentOrmEntity;
}
