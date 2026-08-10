import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('role_permissions')
@Index('UQ_role_permissions_role_section', ['role', 'section'], { unique: true })
export class RolePermissionOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 30 }) role: string;
  @Column({ length: 60 }) section: string;
  @Column({ length: 20 }) level: string;
  @UpdateDateColumn() updatedAt: Date;
}
