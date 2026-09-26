import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PropertyOrmEntity } from '../../infrastructure/database/typeorm/entities/property.orm-entity';
import { BedOrmEntity } from '../../infrastructure/database/typeorm/entities/bed.orm-entity';
import { ResidentOrmEntity } from '../../infrastructure/database/typeorm/entities/resident.orm-entity';
import { BookingOrmEntity } from '../../infrastructure/database/typeorm/entities/booking.orm-entity';
import { MaintenanceTicketOrmEntity } from '../../infrastructure/database/typeorm/entities/maintenance-ticket.orm-entity';
import { LandlordOrmEntity } from '../../infrastructure/database/typeorm/entities/landlord.orm-entity';
import { ReportQueryRequest, ReportQueryResult } from '../../domain/custom-report/report-metadata.types';
import { ReportRegistryService, RegistryField } from './report-registry.service';

// JSON payloads carry filter values as plain strings/numbers/booleans — coerce them to the
// type Postgres expects for the target column so e.g. a "100" string compares correctly
// against a numeric/decimal column instead of relying on implicit driver casting.
function coerceValue(type: RegistryField['type'], value: unknown): unknown {
  if (value === null || value === undefined) return value;
  switch (type) {
    case 'number':
    case 'currency':
      return typeof value === 'number' ? value : Number(value);
    case 'boolean':
      return typeof value === 'boolean' ? value : value === 'true' || value === true;
    case 'date':
      return value instanceof Date ? value : new Date(value as string);
    default:
      return value;
  }
}

@Injectable()
export class ReportQueryService {
  constructor(
    @InjectRepository(PropertyOrmEntity) private readonly propertyRepo: Repository<PropertyOrmEntity>,
    @InjectRepository(BedOrmEntity) private readonly bedRepo: Repository<BedOrmEntity>,
    @InjectRepository(ResidentOrmEntity) private readonly residentRepo: Repository<ResidentOrmEntity>,
    @InjectRepository(BookingOrmEntity) private readonly bookingRepo: Repository<BookingOrmEntity>,
    @InjectRepository(MaintenanceTicketOrmEntity) private readonly ticketRepo: Repository<MaintenanceTicketOrmEntity>,
    @InjectRepository(LandlordOrmEntity) private readonly landlordRepo: Repository<LandlordOrmEntity>,
    private readonly registry: ReportRegistryService,
  ) {}

  private repoFor(entityKey: string): Repository<any> {
    switch (entityKey) {
      case 'properties': return this.propertyRepo;
      case 'beds': return this.bedRepo;
      case 'residents': return this.residentRepo;
      case 'licenceAgreements': return this.bookingRepo;
      case 'maintenanceOperations': return this.ticketRepo;
      case 'landlordAccounts': return this.landlordRepo;
      default: throw new BadRequestException(`Unknown report entity "${entityKey}"`);
    }
  }

  /**
   * Builds and runs a whitelisted, parameterized query for the given request.
   * `cap` bounds the number of rows fetched (preview uses a small cap; export a larger sanity
   * ceiling) — `total`/`capped` tell the caller whether more rows exist than were returned.
   */
  async run(request: ReportQueryRequest, cap: number): Promise<ReportQueryResult> {
    const entity = this.registry.getEntity(request.entity);
    if (!request.fields.length) throw new BadRequestException('At least one field must be selected');

    const selectedFields = request.fields.map((key) => this.registry.getField(request.entity, key));

    const qb = this.repoFor(request.entity).createQueryBuilder(entity.alias);
    const joinedAliases = new Set<string>();

    const ensureJoin = (field: RegistryField) => {
      if (!field.join || joinedAliases.has(field.join.alias)) return;
      qb.leftJoin(`${entity.alias}.${field.join.relation}`, field.join.alias);
      joinedAliases.add(field.join.alias);
    };

    for (const field of selectedFields) ensureJoin(field);

    // Select only the whitelisted columns actually requested, aliased back to the field key so
    // the result rows can be returned as plain `{ [fieldKey]: value }` objects.
    const selectExpressions = selectedFields.map((field) => `${field.column!} AS "${field.key}"`);
    qb.select(selectExpressions);

    for (const [index, filter] of request.filters.entries()) {
      const field = this.registry.getFilterableField(request.entity, filter.field);
      this.registry.assertOperatorAllowed(field, filter.operator);
      ensureJoin(field);
      const param = `f${index}`;
      const column = field.column!;
      const value = coerceValue(field.type, filter.value);
      switch (filter.operator) {
        case '=': qb.andWhere(`${column} = :${param}`, { [param]: value }); break;
        case '!=': qb.andWhere(`${column} != :${param}`, { [param]: value }); break;
        case '>': qb.andWhere(`${column} > :${param}`, { [param]: value }); break;
        case '>=': qb.andWhere(`${column} >= :${param}`, { [param]: value }); break;
        case '<': qb.andWhere(`${column} < :${param}`, { [param]: value }); break;
        case '<=': qb.andWhere(`${column} <= :${param}`, { [param]: value }); break;
        case 'contains': qb.andWhere(`${column} ILIKE :${param}`, { [param]: `%${value}%` }); break;
        case 'in': {
          const values = (Array.isArray(filter.value) ? filter.value : [filter.value]).map((v) => coerceValue(field.type, v));
          qb.andWhere(`${column} IN (:...${param})`, { [param]: values });
          break;
        }
      }
    }

    for (const sort of request.sort) {
      const field = this.registry.getSortableField(request.entity, sort.field);
      ensureJoin(field);
      qb.addOrderBy(field.column!, sort.direction);
    }

    const total = await qb.getCount();
    const rows = await qb.take(cap).getRawMany();

    return { rows, total, capped: total > cap };
  }
}
