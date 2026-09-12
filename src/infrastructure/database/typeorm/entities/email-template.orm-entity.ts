import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('email_templates')
export class EmailTemplateOrmEntity {
  @PrimaryColumn({ length: 30 }) key: string;
  @Column({ length: 300 }) subject: string;
  @Column({ type: 'text' }) body: string;
  @UpdateDateColumn() updatedAt: Date;
}
