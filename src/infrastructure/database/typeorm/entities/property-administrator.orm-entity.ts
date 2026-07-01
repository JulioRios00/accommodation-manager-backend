import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('property_administrators')
export class PropertyAdministratorOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') propertyId: string;
  @Column({ length: 100 }) clerkUserId: string;
  @Column({ length: 200 }) clerkUserName: string;
  @CreateDateColumn() addedAt: Date;
}
