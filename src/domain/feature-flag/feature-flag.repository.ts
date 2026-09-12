import { FeatureFlag, FeatureFlagKey } from './feature-flag.entity';

export const FEATURE_FLAG_REPOSITORY = 'FEATURE_FLAG_REPOSITORY';

export interface IFeatureFlagRepository {
  findAll(): Promise<FeatureFlag[]>;
  findByKey(key: FeatureFlagKey): Promise<FeatureFlag | null>;
  setEnabled(key: FeatureFlagKey, enabled: boolean): Promise<FeatureFlag>;
}
