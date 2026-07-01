import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('maintenance_tickets')
export class MaintenanceTicketOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 20 }) orderNumber: string;
  @Column('uuid') propertyId: string;
  @Column({ type: 'uuid', nullable: true }) serviceProviderId: string;
  @Column({ length: 300 }) title: string;
  @Column({ type: 'text', nullable: true }) descriptionRequested: string;
  @Column({ type: 'text', nullable: true }) additionalDetails: string;
  @Column({ type: 'text', nullable: true }) descriptionDone: string;
  @Column({ type: 'text', nullable: true }) materials: string;
  @Column({ type: 'int', default: 0 }) priority: number;
  @Column({ length: 20, default: 'Low' }) urgency: string;
  @Column({ length: 30, default: 'open' }) status: string;
  @Column({ length: 200, nullable: true }) clientName: string;
  @Column({ length: 50, nullable: true }) clientPhone: string;
  @Column({ length: 200, nullable: true }) approvedBy: string;
  @Column({ type: 'date', nullable: true }) approvalDate: Date;
  @Column({ length: 200, nullable: true }) chargedBy: string;
  @Column({ length: 200, nullable: true }) houseCompany: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) maintenanceCost: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) materialCost: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) totalCost: number;
  @Column({ type: 'date', nullable: true }) entryNoticeDate: Date;
  @Column({ length: 10, nullable: true }) entryCheckIn: string;
  @Column({ length: 10, nullable: true }) entryCheckOut: string;
  @Column({ default: false }) causedByResident: boolean;
  @Column({ type: 'simple-array', nullable: true }) tags: string[];
  @Column({ length: 100, nullable: true }) clerkUserId: string;
  @Column({ length: 200, nullable: true }) clerkUserName: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
