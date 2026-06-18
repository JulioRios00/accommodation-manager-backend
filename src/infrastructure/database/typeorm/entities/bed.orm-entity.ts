import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyOrmEntity } from './property.orm-entity';
import { BookingOrmEntity } from './booking.orm-entity';

@Entity('beds')
export class BedOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  propertyId: string;

  @Column()
  bedNumber: number;

  @Column({ length: 50 })
  bedroomType: string;

  @Column({ length: 10 })
  sex: string;

  @Column({ length: 20 })
  bedSize: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  rentAmount: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => PropertyOrmEntity, (property) => property.beds)
  property: PropertyOrmEntity;

  @OneToMany(() => BookingOrmEntity, (booking) => booking.bed)
  bookings: BookingOrmEntity[];
}
