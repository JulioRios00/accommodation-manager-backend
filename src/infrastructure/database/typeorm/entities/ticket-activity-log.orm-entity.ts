import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ticket_activity_logs')
export class TicketActivityLogOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') ticketId: string;
  @Column({ length: 50 }) eventType: string;
  @Column({ length: 100, nullable: true }) clerkUserId: string;
  @Column({ length: 200, nullable: true }) clerkUserName: string;
  @Column({ type: 'text', nullable: true }) comment: string;
  @Column({ length: 100, nullable: true }) field: string;
  @Column({ type: 'text', nullable: true }) oldValue: string;
  @Column({ type: 'text', nullable: true }) newValue: string;
  @CreateDateColumn() createdAt: Date;
}
