import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('service_providers')
export class ServiceProviderOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 200 }) name: string;
  @Column({ length: 200, nullable: true }) contactName: string;
  @Column({ length: 50, nullable: true }) phone: string;
  @Column({ length: 200, nullable: true }) email: string;
  @Column({ length: 100, nullable: true }) specialty: string;
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
