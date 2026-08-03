import {
  Column, CreateDateColumn, Entity, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { PropertySpaceOrmEntity } from './property-space.orm-entity';

@Entity('space_items')
export class SpaceItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  spaceId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ length: 30, nullable: true })
  condition: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => PropertySpaceOrmEntity, (space) => space.items)
  space: PropertySpaceOrmEntity;
}
