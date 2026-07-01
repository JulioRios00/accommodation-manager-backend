export class Property {
  id: string;
  code: string;
  bu: string;
  area: string | null;
  fullAddress: string | null;

  // Key inventory
  officeKeysCount: number;
  keysCount: number;
  securityKeysCount: number;
  fobCount: number;
  keyCode: string | null;

  // Electricity
  electricityStatus: string | null;
  electricityMprn: string | null;
  electricitySupplier: string | null;
  electricityAccountNumber: string | null;
  electricityKeypadCode: string | null;

  // Gas
  gasStatus: string | null;
  gasGprn: string | null;
  gasSupplier: string | null;
  gasAccountNumber: string | null;
  gasPin: string | null;

  // Waste / Bin
  wasteSupplier: string | null;
  wasteAccountNumber: string | null;
  wasteEmail: string | null;
  wastePassword: string | null;
  wastePaymentType: string | null;
  wasteMonthlyAmount: number | null;
  wasteStatus: string | null;

  // Internet
  internetSupplier: string | null;
  internetAccountNumber: string | null;
  internetEmail: string | null;
  internetUsername: string | null;
  internetPassword: string | null;
  internetPaymentType: string | null;
  internetStatus: string | null;
  internetContractEndDate: Date | null;

  // Sales
  salesDescription: string | null;

  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
