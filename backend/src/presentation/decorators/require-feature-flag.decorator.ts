import { SetMetadata } from '@nestjs/common';
import { FeatureFlagKey } from '../../domain/feature-flag/feature-flag.entity';

export const FEATURE_FLAG_KEY = 'featureFlag';
export const RequireFeatureFlag = (key: FeatureFlagKey) => SetMetadata(FEATURE_FLAG_KEY, key);
