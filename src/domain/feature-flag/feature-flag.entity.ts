export type FeatureFlagKey = 'receivables_ledger' | 'overdue_escalation' | 'landlord_disbursements';

// Defaults to enabled: true — these are already-shipped features, not a staged rollout, so
// the flag starts as a kill switch rather than something that has to be turned on first.
export const FEATURE_FLAG_DEFS: { key: FeatureFlagKey; label: string; description: string }[] = [
  {
    key: 'receivables_ledger',
    label: 'Receivables Ledger',
    description: 'Pending rent charge ledger and the "Mark as Received" bank-reconciliation action (UC-501).',
  },
  {
    key: 'overdue_escalation',
    label: 'Overdue Escalation Emails',
    description: 'Daily D+1/D+4 automated reminder emails and the Communication Settings template editor (UC-501).',
  },
  {
    key: 'landlord_disbursements',
    label: 'Landlord Disbursements',
    description: 'Landlord disbursement ledger, notes, "Mark as Paid", and the bank batch CSV export (UC-502).',
  },
];

export const FEATURE_FLAG_KEYS: FeatureFlagKey[] = FEATURE_FLAG_DEFS.map((d) => d.key);

export class FeatureFlag {
  key: FeatureFlagKey;
  enabled: boolean;
  updatedAt: Date;
}
