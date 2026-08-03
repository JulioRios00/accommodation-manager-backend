import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BedOrmEntity } from './bed.orm-entity';

@Entity('bedrooms')
export class BedroomOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  propertyId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BedOrmEntity, (bed) => bed.bedroom)
  beds: BedOrmEntity[];
}
