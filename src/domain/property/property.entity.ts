export class Property {
  id: string;
  code: string;
  bu: string;
  area: string | null;
  fullAddress: string | null;
  officeKeys: boolean;
  keysCount: number;
  securityKeysCount: number;
  fobCount: number;
  electricityStatus: string | null;
  gasStatus: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
