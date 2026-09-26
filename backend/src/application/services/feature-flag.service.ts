import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FEATURE_FLAG_REPOSITORY, IFeatureFlagRepository } from '../../domain/feature-flag/feature-flag.repository';
import { FEATURE_FLAG_DEFS, FEATURE_FLAG_KEYS, FeatureFlagKey } from '../../domain/feature-flag/feature-flag.entity';

export interface FeatureFlagView {
  key: FeatureFlagKey;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: Date | null;
}

@Injectable()
export class FeatureFlagService {
  constructor(@Inject(FEATURE_FLAG_REPOSITORY) private readonly repo: IFeatureFlagRepository) {}

  /** No stored row means "never toggled" — defaults to enabled, since these are already-shipped
   *  features being fitted with a kill switch, not a staged rollout starting from off. */
  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    const flag = await this.repo.findByKey(key);
    return flag?.enabled ?? true;
  }

  async listAll(): Promise<FeatureFlagView[]> {
    const stored = await this.repo.findAll();
    const byKey = new Map(stored.map((f) => [f.key, f]));
    return FEATURE_FLAG_DEFS.map((def) => {
      const flag = byKey.get(def.key);
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        enabled: flag?.enabled ?? true,
        updatedAt: flag?.updatedAt ?? null,
      };
    });
  }

  async setEnabled(key: string, enabled: boolean): Promise<FeatureFlagView> {
    if (!FEATURE_FLAG_KEYS.includes(key as FeatureFlagKey)) {
      throw new BadRequestException(`Unknown feature flag "${key}"`);
    }
    const flag = await this.repo.setEnabled(key as FeatureFlagKey, enabled);
    const def = FEATURE_FLAG_DEFS.find((d) => d.key === key)!;
    return { key: flag.key, label: def.label, description: def.description, enabled: flag.enabled, updatedAt: flag.updatedAt };
  }
}
