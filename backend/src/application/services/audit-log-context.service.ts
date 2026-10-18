import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditLog } from '../../domain/audit-log/audit-log.entity';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';
import { bedroomLetterFromName } from '../../domain/bed/bed-code.util';

/** An audit row plus the human-readable context needed to find the record it describes. */
export interface AuditLogWithContext extends AuditLog {
  /** e.g. "Ana Silva — 136SV — 2026-10". Null when the record can't be resolved. */
  entityLabel: string | null;
  /** The related records, with the text needed to find each one. The UI turns these
   *  into links; names are included because the target pages locate records by
   *  searching their visible text, not by id. */
  entityLinks: {
    residentId?: string;
    residentName?: string;
    propertyId?: string;
    propertyCode?: string;
    bookingId?: string;
    bedId?: string;
    bedCode?: string;
    landlordId?: string;
  };
}

/**
 * Turns `RentPayment / 7c3f1a2b-…` into something a person can act on.
 *
 * Resolved when the log is read rather than captured when it is written, for two reasons:
 * the history already in the database becomes useful immediately, and 17 call sites don't
 * have to learn how to describe themselves. The trade-off is that names shown are current
 * rather than as-at the change — which is what "locate this in the system" actually needs,
 * but it does mean a renamed resident reads under their new name.
 *
 * Entities that no longer exist resolve to null and the UI falls back to the raw id; the
 * change detail in the log is unaffected either way.
 */
@Injectable()
export class AuditLogContextService {
  private readonly logger = new Logger(AuditLogContextService.name);

  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly rentPayments: IRentPaymentRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookings: IBookingRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residents: IResidentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly properties: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly beds: IBedRepository,
    @Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly landlordPayments: ILandlordPaymentRepository,
    @Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly deposits: IDepositTransactionRepository,
  ) {}

  async enrich(logs: AuditLog[]): Promise<AuditLogWithContext[]> {
    if (logs.length === 0) return [];

    try {
      // Name lookups are loaded once and shared. These tables are small, and nearly every
      // label needs at least one of them, so this is cheaper than resolving per row.
      const [residents, properties, beds] = await Promise.all([
        this.residents.findAll(),
        this.properties.findAll(true),
        this.beds.findAll(),
      ]);
      const residentName = new Map(residents.map(r => [r.id, r.fullName]));
      const propertyCode = new Map(properties.map(p => [p.id, p.code]));
      const bedById = new Map(beds.map(b => [b.id, b]));

      const bedLabel = (bedId?: string | null) => {
        const bed = bedId ? bedById.get(bedId) : undefined;
        if (!bed) return null;
        const letter = bedroomLetterFromName(bed.bedroomName);
        const code = propertyCode.get(bed.propertyId);
        return [code, letter ? `${letter}${bed.bedNumber}` : `Bed ${bed.bedNumber}`].filter(Boolean).join('-');
      };

      // One fetch per distinct record referenced, not per log line — the same payment
      // edited five times resolves once.
      const targets = new Map<string, { entityType: string; entityId: string }>();
      for (const log of logs) {
        targets.set(`${log.entityType}|${log.entityId}`, { entityType: log.entityType, entityId: log.entityId });
      }

      const resolved = new Map<string, { label: string | null; links: AuditLogWithContext['entityLinks'] }>();
      await Promise.all(
        [...targets].map(async ([key, { entityType, entityId }]) => {
          try {
            resolved.set(key, await this.describe(entityType, entityId, { residentName, propertyCode, bedLabel }));
          } catch {
            resolved.set(key, { label: null, links: {} });
          }
        }),
      );

      return logs.map(log => {
        const r = resolved.get(`${log.entityType}|${log.entityId}`);
        return { ...log, entityLabel: r?.label ?? null, entityLinks: r?.links ?? {} };
      });
    } catch (err) {
      // Context is an aid to reading the log, never a reason not to show it.
      this.logger.warn(`[audit-log-context] enrichment failed, returning plain logs: ${(err as Error).message}`);
      return logs.map(log => ({ ...log, entityLabel: null, entityLinks: {} }));
    }
  }

  private async describe(
    entityType: string,
    entityId: string,
    maps: {
      residentName: Map<string, string>;
      propertyCode: Map<string, string>;
      bedLabel: (bedId?: string | null) => string | null;
    },
  ): Promise<{ label: string | null; links: AuditLogWithContext['entityLinks'] }> {
    const { residentName, propertyCode, bedLabel } = maps;
    const join = (...parts: (string | null | undefined)[]) => {
      const kept = parts.filter((p): p is string => !!p);
      return kept.length ? kept.join(' — ') : null;
    };

    switch (entityType) {
      case 'RentPayment': {
        const p = await this.rentPayments.findById(entityId);
        if (!p) return { label: null, links: {} };
        return {
          label: join(residentName.get(p.residentId), propertyCode.get(p.propertyId), p.month),
          links: {
            residentId: p.residentId,
            residentName: residentName.get(p.residentId),
            propertyId: p.propertyId,
            propertyCode: propertyCode.get(p.propertyId),
            bookingId: p.bookingId ?? undefined,
          },
        };
      }
      case 'LandlordPayment': {
        const p = await this.landlordPayments.findById(entityId);
        if (!p) return { label: null, links: {} };
        return {
          label: join(propertyCode.get(p.propertyId), p.month),
          links: {
            propertyId: p.propertyId,
            propertyCode: propertyCode.get(p.propertyId),
            landlordId: p.landlordId ?? undefined,
          },
        };
      }
      case 'Booking': {
        const b = await this.bookings.findById(entityId);
        if (!b) return { label: null, links: {} };
        return {
          label: join(residentName.get(b.residentId), bedLabel(b.bedId)),
          links: {
            residentId: b.residentId,
            residentName: residentName.get(b.residentId),
            bedId: b.bedId ?? undefined,
            bedCode: bedLabel(b.bedId) ?? undefined,
          },
        };
      }
      case 'DepositTransaction': {
        const d = await this.deposits.findById(entityId);
        if (!d) return { label: null, links: {} };
        return {
          label: join(d.residentName, propertyCode.get(d.propertyId), d.type),
          links: {
            residentId: d.residentId ?? undefined,
            residentName: d.residentName ?? undefined,
            propertyId: d.propertyId,
            propertyCode: propertyCode.get(d.propertyId),
            bedId: d.bedId ?? undefined,
            bedCode: bedLabel(d.bedId) ?? undefined,
          },
        };
      }
      case 'Resident': {
        const name = residentName.get(entityId);
        return { label: name ?? null, links: name ? { residentId: entityId, residentName: name } : {} };
      }
      case 'Property': {
        const code = propertyCode.get(entityId);
        return { label: code ?? null, links: code ? { propertyId: entityId, propertyCode: code } : {} };
      }
      case 'Bed': {
        const label = bedLabel(entityId);
        return { label, links: label ? { bedId: entityId, bedCode: label } : {} };
      }
      default:
        // CustomReport and anything added later — no context rather than a wrong guess.
        return { label: null, links: {} };
    }
  }
}
