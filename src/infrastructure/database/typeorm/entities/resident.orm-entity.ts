import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingOrmEntity } from './booking.orm-entity';

@Entity('residents')
export class ResidentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  fullName: string;

  @Column({ length: 200, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  telephone: string;

  @Column({ length: 100, nullable: true })
  nationality: string;

  @Column({ length: 100, nullable: true })
  personalId: string;

  @Column({ length: 50, nullable: true })
  iban: string;

  @Column({ type: 'text', nullable: true })
  emergencyContact: string;

  @Column({ length: 100, nullable: true })
  source: string;

  @Column({ nullable: true, type: 'int' })
  paymentDueDay: number;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ default: false })
  delinquent: boolean;

  @Column({ default: false })
  hasObservation: boolean;

  @Column({ type: 'text', nullable: true })
  observation: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BookingOrmEntity, (booking) => booking.resident)
  bookings: BookingOrmEntity[];
}
