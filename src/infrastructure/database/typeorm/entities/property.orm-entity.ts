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

  @Column({ default: false })
  officeKeys: boolean;

  @Column({ default: 0 })
  keysCount: number;

  @Column({ default: 0 })
  securityKeysCount: number;

  @Column({ default: 0 })
  fobCount: number;

  @Column({ length: 20, nullable: true })
  electricityStatus: string;

  @Column({ length: 20, nullable: true })
  gasStatus: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BedOrmEntity, (bed) => bed.property)
  beds: BedOrmEntity[];
}
