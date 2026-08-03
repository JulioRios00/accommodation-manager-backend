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
import { BedroomOrmEntity } from './bedroom.orm-entity';

@Entity('beds')
export class BedOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  propertyId: string;

  @Column({ type: 'uuid', nullable: true })
  bedroomId: string;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ type: 'int', nullable: true })
  position: number;

  @Column({ length: 20, default: 'vacant' })
  status: string;

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

  @ManyToOne(() => BedroomOrmEntity, (bedroom) => bedroom.beds, { nullable: true })
  bedroom: BedroomOrmEntity;

  @OneToMany(() => BookingOrmEntity, (booking) => booking.bed)
  bookings: BookingOrmEntity[];
}
