import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from '../../../../domain/notification/notification.entity';

@Entity('notifications')
export class NotificationOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column('uuid') residentId: string;
  @Column({ length: 40 }) type: NotificationType;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'timestamptz', nullable: true }) readAt: Date;
  @CreateDateColumn() createdAt: Date;
}
