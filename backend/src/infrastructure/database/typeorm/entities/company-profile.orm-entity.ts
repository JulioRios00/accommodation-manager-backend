import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DEFAULT_APP_NAME } from '../../../../domain/company-profile/company-profile.entity';

/** Single-row table: the primary key is the fixed string COMPANY_PROFILE_ID, so there
 *  can only ever be one profile and no "which row is current?" question arises. */
@Entity('company_profile')
export class CompanyProfileOrmEntity {
  @PrimaryColumn({ length: 20 }) id: string;
  @Column({ length: 60, default: DEFAULT_APP_NAME }) appName: string;
  @Column({ type: 'text', nullable: true }) logoDataUrl: string | null;
  @UpdateDateColumn() updatedAt: Date;
}
