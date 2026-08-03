import {
  Column, CreateDateColumn, Entity, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { SpaceItemOrmEntity } from './space-item.orm-entity';

@Entity('property_spaces')
export class PropertySpaceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  propertyId: string;

  @Column({ length: 30 })
  category: string;

  @Column({ length: 150 })
  name: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SpaceItemOrmEntity, (item) => item.space, { cascade: true })
  items: SpaceItemOrmEntity[];
}
