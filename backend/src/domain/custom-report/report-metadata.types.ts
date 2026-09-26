export type ReportEntityKey =
  | 'properties'
  | 'beds'
  | 'residents'
  | 'licenceAgreements'
  | 'maintenanceOperations'
  | 'landlordAccounts';

export type ReportFieldType = 'string' | 'number' | 'currency' | 'boolean' | 'date' | 'enum';

export type ReportFilterOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'in';

/** Operators each field type accepts — the same table is mirrored on the frontend so the UI
 *  never offers a combination the backend would reject. */
export const OPERATORS_BY_TYPE: Record<ReportFieldType, ReportFilterOperator[]> = {
  string: ['=', '!=', 'contains', 'in'],
  number: ['=', '!=', '>', '>=', '<', '<=', 'in'],
  currency: ['=', '!=', '>', '>=', '<', '<=', 'in'],
  boolean: ['=', '!='],
  date: ['=', '!=', '>', '>=', '<', '<='],
  enum: ['=', '!=', 'in'],
};

export interface ReportFieldMeta {
  key: string;
  label: string;
  type: ReportFieldType;
  filterable: boolean;
  sortable: boolean;
  /** Enum-typed fields list their valid values here for the frontend to render as a dropdown. */
  enumValues?: string[];
}

export interface ReportEntityMeta {
  key: ReportEntityKey;
  label: string;
}

export interface ReportFilter {
  field: string;
  operator: ReportFilterOperator;
  value: unknown;
}

export interface ReportSort {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface ReportQueryRequest {
  entity: ReportEntityKey;
  fields: string[];
  filters: ReportFilter[];
  sort: ReportSort[];
}

export interface ReportQueryResult {
  rows: Record<string, unknown>[];
  total: number;
  capped: boolean;
}
