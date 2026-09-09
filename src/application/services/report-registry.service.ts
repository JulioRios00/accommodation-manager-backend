import { Injectable, BadRequestException } from '@nestjs/common';
import { PropertyOrmEntity } from '../../infrastructure/database/typeorm/entities/property.orm-entity';
import { BedOrmEntity } from '../../infrastructure/database/typeorm/entities/bed.orm-entity';
import { ResidentOrmEntity } from '../../infrastructure/database/typeorm/entities/resident.orm-entity';
import { BookingOrmEntity } from '../../infrastructure/database/typeorm/entities/booking.orm-entity';
import { MaintenanceTicketOrmEntity } from '../../infrastructure/database/typeorm/entities/maintenance-ticket.orm-entity';
import { LandlordOrmEntity } from '../../infrastructure/database/typeorm/entities/landlord.orm-entity';
import {
  OPERATORS_BY_TYPE,
  ReportEntityKey,
  ReportEntityMeta,
  ReportFieldMeta,
  ReportFilterOperator,
} from '../../domain/custom-report/report-metadata.types';

/** A join needed to reach a field that doesn't live on the entity's own table. */
export interface RegistryJoin {
  /** Alias used in the query (e.g. 'property' for beds.property). */
  alias: string;
  /** Relation property name on the root entity to join through (TypeORM relation path). */
  relation: string;
}

/** Registry-internal field descriptor — carries the actual SQL column reference the public
 *  ReportFieldMeta doesn't need to expose to the frontend. */
export interface RegistryField extends ReportFieldMeta {
  /** `${alias}.${column}` reference used when building the QueryBuilder — backfilled for plain
   *  (non-joined) fields by the ReportRegistryService constructor, so it's optional here. */
  column?: string;
  join?: RegistryJoin;
}

export interface RegistryEntity extends ReportEntityMeta {
  ormEntity: new () => object;
  alias: string;
  fields: RegistryField[];
}

const REGISTRY: Record<ReportEntityKey, RegistryEntity> = {
  properties: {
    key: 'properties',
    label: 'Properties',
    ormEntity: PropertyOrmEntity,
    alias: 'property',
    fields: [
      f('code', 'Code', 'string'),
      f('eirCode', 'Eircode', 'string'),
      f('bu', 'Business Unit', 'string'),
      f('area', 'Area', 'string'),
      f('fullAddress', 'Full Address', 'string'),
      f('propertyType', 'Property Type', 'string'),
      f('officeKeysCount', 'Office Keys', 'number'),
      f('keysCount', 'Keys', 'number'),
      f('securityKeysCount', 'Security Keys', 'number'),
      f('fobCount', 'Fobs', 'number'),
      f('electricityStatus', 'Electricity Status', 'string'),
      f('electricitySupplier', 'Electricity Supplier', 'string'),
      f('gasStatus', 'Gas Status', 'string'),
      f('gasSupplier', 'Gas Supplier', 'string'),
      f('wasteStatus', 'Waste Status', 'string'),
      f('wasteSupplier', 'Waste Supplier', 'string'),
      f('wasteMonthlyAmount', 'Waste Monthly Amount', 'currency'),
      f('internetStatus', 'Internet Status', 'string'),
      f('internetSupplier', 'Internet Supplier', 'string'),
      f('crn', 'CRN', 'string'),
      f('propertyEmail', 'Property E-mail', 'string'),
      f('landlordPaymentDueDay', 'Landlord Payment Due Day', 'number'),
      f('residentPaymentDueDay', 'Resident Payment Due Day', 'number'),
      f('leaseStartDate', 'Lease Start Date', 'date'),
      f('leaseEndDate', 'Lease End Date', 'date'),
      f('active', 'Active', 'boolean'),
      f('createdAt', 'Created At', 'date'),
    ],
  },
  beds: {
    key: 'beds',
    label: 'Beds & Inventory',
    ormEntity: BedOrmEntity,
    alias: 'bed',
    fields: [
      f('bedNumber', 'Bed Number', 'number'),
      f('name', 'Bed Name', 'string'),
      f('status', 'Status', 'enum', { enumValues: ['vacant', 'allocated'] }),
      f('bedroomType', 'Bedroom Type', 'string'),
      f('sex', 'Sex', 'string'),
      f('bedSize', 'Bed Size', 'string'),
      f('depositAmount', 'Deposit', 'currency'),
      f('rentAmount', 'Rent', 'currency'),
      f('active', 'Active', 'boolean'),
      f('createdAt', 'Created At', 'date'),
      j('propertyCode', 'Property Code', 'string', { alias: 'property', relation: 'property' }, 'code'),
    ],
  },
  residents: {
    key: 'residents',
    label: 'Residents',
    ormEntity: ResidentOrmEntity,
    alias: 'resident',
    fields: [
      f('fullName', 'Full Name', 'string'),
      f('email', 'E-mail', 'string'),
      f('telephone', 'Telephone', 'string'),
      f('gender', 'Gender', 'string'),
      f('nationality', 'Nationality', 'string'),
      f('personalId', 'Personal ID', 'string'),
      f('iban', 'IBAN', 'string'),
      f('source', 'Source', 'string'),
      f('paymentDueDay', 'Payment Due Day', 'number'),
      f('delinquent', 'Delinquent', 'boolean'),
      f('hasObservation', 'Has Observation', 'boolean'),
      f('active', 'Active', 'boolean'),
      f('createdAt', 'Created At', 'date'),
    ],
  },
  licenceAgreements: {
    key: 'licenceAgreements',
    label: 'Licence Agreements',
    ormEntity: BookingOrmEntity,
    alias: 'booking',
    fields: [
      f('status', 'Status', 'enum', { enumValues: ['active', 'upcoming', 'completed'] }),
      f('checkInDate', 'Check-in Date', 'date'),
      f('contractEndDate', 'Contract End Date', 'date'),
      f('checkOutDate', 'Check-out Date', 'date'),
      f('depositAmount', 'Deposit', 'currency'),
      f('rentAmount', 'Rent', 'currency'),
      f('isHeadResident', 'Head Resident', 'boolean'),
      f('isTemporary', 'Temporary', 'boolean'),
      f('active', 'Active', 'boolean'),
      f('createdAt', 'Created At', 'date'),
      j('residentName', 'Resident Name', 'string', { alias: 'resident', relation: 'resident' }, 'fullName'),
      j('bedNumber', 'Bed Number', 'number', { alias: 'bed', relation: 'bed' }, 'bedNumber'),
    ],
  },
  maintenanceOperations: {
    key: 'maintenanceOperations',
    label: 'Maintenance Operations',
    ormEntity: MaintenanceTicketOrmEntity,
    alias: 'ticket',
    fields: [
      f('orderNumber', 'Order Number', 'string'),
      f('category', 'Category', 'string'),
      f('title', 'Title', 'string'),
      f('priority', 'Priority', 'number'),
      f('urgency', 'Urgency', 'string'),
      f('status', 'Status', 'string'),
      f('maintenanceCost', 'Maintenance Cost', 'currency'),
      f('materialCost', 'Material Cost', 'currency'),
      f('totalCost', 'Total Cost', 'currency'),
      f('causedByResident', 'Caused By Resident', 'boolean'),
      f('entryNoticeDate', 'Entry Notice Date', 'date'),
      f('approvalDate', 'Approval Date', 'date'),
      f('active', 'Active', 'boolean'),
      f('createdAt', 'Created At', 'date'),
    ],
  },
  landlordAccounts: {
    key: 'landlordAccounts',
    label: 'Landlord Accounts',
    ormEntity: LandlordOrmEntity,
    alias: 'landlord',
    fields: [
      f('name', 'Name', 'string'),
      f('email', 'E-mail', 'string'),
      f('bankName', 'Bank Name', 'string'),
      f('iban', 'IBAN', 'string'),
      f('bic', 'BIC', 'string'),
      f('paymentMethod', 'Payment Method', 'string'),
      f('residentPaymentDueDay', 'Resident Payment Due Day', 'number'),
      f('active', 'Active', 'boolean'),
      f('createdAt', 'Created At', 'date'),
    ],
  },
};

/** Builds a direct (non-joined) field descriptor — `key` doubles as the column name on the
 *  entity's own table, referenced as `${alias}.${key}` at query time. */
function f(
  key: string,
  label: string,
  type: RegistryField['type'],
  extra: Partial<Pick<RegistryField, 'enumValues'>> = {},
): RegistryField {
  return { key, label, type, filterable: true, sortable: true, ...extra };
}

/** Builds a joined, read-only convenience field (e.g. a related record's display name) —
 *  filterable/sortable so it behaves like any other field, resolved via a LEFT JOIN. */
function j(
  key: string,
  label: string,
  type: RegistryField['type'],
  join: RegistryJoin,
  joinColumn: string,
): RegistryField {
  return { key, label, type, filterable: true, sortable: true, join, column: `${join.alias}.${joinColumn}` };
}

@Injectable()
export class ReportRegistryService {
  private readonly entities: Record<ReportEntityKey, RegistryEntity>;

  constructor() {
    // Fill in `column` for plain (non-joined) fields now that each entity's own alias is known.
    this.entities = REGISTRY;
    for (const entity of Object.values(this.entities)) {
      for (const field of entity.fields) {
        if (!field.column) field.column = `${entity.alias}.${field.key}`;
      }
    }
  }

  listEntities(): ReportEntityMeta[] {
    return Object.values(this.entities).map(({ key, label }) => ({ key, label }));
  }

  getEntity(key: string): RegistryEntity {
    const entity = this.entities[key as ReportEntityKey];
    if (!entity) throw new BadRequestException(`Unknown report entity "${key}"`);
    return entity;
  }

  listFields(entityKey: string): ReportFieldMeta[] {
    return this.getEntity(entityKey).fields.map(({ key, label, type, filterable, sortable, enumValues }) => ({
      key,
      label,
      type,
      filterable,
      sortable,
      enumValues,
    }));
  }

  /** Whitelist lookup — throws if the field doesn't exist on this entity at all. */
  getField(entityKey: string, fieldKey: string): RegistryField {
    const field = this.getEntity(entityKey).fields.find((fd) => fd.key === fieldKey);
    if (!field) throw new BadRequestException(`Unknown field "${fieldKey}" on report entity "${entityKey}"`);
    return field;
  }

  getFilterableField(entityKey: string, fieldKey: string): RegistryField {
    const field = this.getField(entityKey, fieldKey);
    if (!field.filterable) throw new BadRequestException(`Field "${fieldKey}" is not filterable`);
    return field;
  }

  getSortableField(entityKey: string, fieldKey: string): RegistryField {
    const field = this.getField(entityKey, fieldKey);
    if (!field.sortable) throw new BadRequestException(`Field "${fieldKey}" is not sortable`);
    return field;
  }

  assertOperatorAllowed(field: RegistryField, operator: ReportFilterOperator): void {
    if (!OPERATORS_BY_TYPE[field.type].includes(operator)) {
      throw new BadRequestException(`Operator "${operator}" is not valid for field "${field.key}" (type ${field.type})`);
    }
  }
}
