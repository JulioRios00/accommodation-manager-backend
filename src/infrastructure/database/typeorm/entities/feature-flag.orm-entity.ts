import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('feature_flags')
export class FeatureFlagOrmEntity {
  @PrimaryColumn({ length: 40 }) key: string;
  @Column({ default: true }) enabled: boolean;
  @UpdateDateColumn() updatedAt: Date;
}
