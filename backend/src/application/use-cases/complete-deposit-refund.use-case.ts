import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';
import { EmailService } from '../services/email.service';
import { NotificationService } from '../services/notification.service';

const RESIDENT_MESSAGE =
  'Your deposit refund payment has been completed and processed. Please allow standard bank clearing timelines for funds to arrive.';

@Injectable()
export class CompleteDepositRefundUseCase {
  private readonly logger = new Logger(CompleteDepositRefundUseCase.name);

  constructor(
    @Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly depositRepo: IDepositTransactionRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(id: string, actor?: Actor, completedByName?: string | null) {
    const deposit = await this.depositRepo.findById(id);
    if (!deposit) throw new NotFoundException(`DepositTransaction ${id} not found`);
    if (deposit.type !== 'refund') throw new ConflictException(`DepositTransaction ${id} is not a refund`);

    // Idempotent by design: re-calling on an already-completed refund is a clear error, not a
    // silent no-op or a second round of notifications.
    if (deposit.status === 'done') {
      throw new ConflictException(`Deposit refund ${id} is already complete`);
    }

    const updated = await this.depositRepo.save({
      ...deposit,
      status: 'done',
      dateProcessed: new Date(),
      completedBy: actor?.userId ?? null,
      completedByName: completedByName ?? null,
    });

    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: 'DepositTransaction',
      entityId: deposit.id,
      before: deposit as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    // Notify immediately (not a batch job), and don't let a notification failure undo an
    // already-completed refund — log and move on, same isolation as the D+1/D+4 escalation job.
    if (deposit.residentId) {
      const resident = await this.residentRepo.findById(deposit.residentId);
      if (resident?.email) {
        try {
          await this.emailService.send(resident.email, 'Your deposit refund has been processed', `<p>${RESIDENT_MESSAGE}</p>`);
        } catch (err) {
          this.logger.error(`[deposit-refund] failed to email resident ${deposit.residentId}: ${(err as Error).message}`);
        }
      } else {
        this.logger.warn(`[deposit-refund] resident ${deposit.residentId} has no email — skipping email notification`);
      }
      await this.notificationService.send(
        deposit.residentId,
        'deposit_refund_completed',
        'Deposit refund processed',
        RESIDENT_MESSAGE,
      );
    }

    return updated;
  }
}
