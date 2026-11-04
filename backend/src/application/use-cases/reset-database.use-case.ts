import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Actor } from '../services/audit-log.service';
import { AuditLogService } from '../services/audit-log.service';

/**
 * The phrase a caller has to send to prove the request was not a stray click or a
 * copy-pasted curl. Deliberately not "yes" or "confirm": it has to be typed.
 */
export const RESET_CONFIRMATION = 'DELETE EVERYTHING';

export interface ResetDatabaseResult {
  /** Rows each table held immediately before the truncate, highest first. */
  tables: { table: string; rows: number }[];
  rowsDeleted: number;
  tablesCleared: number;
  completedAt: Date;
}

/**
 * Empties every table in the `public` schema and restarts its identity sequences.
 *
 * This exists so a bad import can be undone wholesale: wipe, correct the spreadsheet,
 * import again. It is not a soft delete and it is not reversible from inside the
 * application — there is no undo, and the only route back is a Neon restore.
 *
 * It keeps the schema (TypeORM's `synchronize` owns that), so the app keeps running
 * afterwards with every table present and empty. Configuration tables go too:
 * `role_permissions`, `feature_flags` and `email_templates` all fall back to their
 * built-in defaults when empty, but `company_profile` and `companies` are typed in by
 * hand and will have to be entered again.
 *
 * Clerk is a separate system and is untouched — logins, roles and resident portal
 * accounts all survive, so a wipe leaves orphaned portal accounts pointing at residents
 * that no longer exist until the next import recreates them.
 */
@Injectable()
export class ResetDatabaseUseCase {
  private readonly logger = new Logger(ResetDatabaseUseCase.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(actor?: Actor): Promise<ResetDatabaseResult> {
    const tables = await this.countRows();
    const rowsDeleted = tables.reduce((sum, t) => sum + t.rows, 0);

    this.logger.warn(
      `[reset-database] ${actor?.userId ?? 'unknown'} (${actor?.role ?? 'no role'}) is emptying ` +
      `${tables.length} tables holding ${rowsDeleted} rows.`,
    );

    // One statement, so either every table is emptied or none is. TRUNCATE takes an ACCESS
    // EXCLUSIVE lock per table; doing them one at a time would leave the application reading
    // a half-wiped database in between, with foreign keys pointing at rows that had gone.
    await this.dataSource.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
        ) LOOP
          EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
        END LOOP;
      END $$;
    `);

    const completedAt = new Date();
    this.logger.warn(`[reset-database] done — ${rowsDeleted} rows removed from ${tables.length} tables.`);

    // Written after the truncate on purpose: the audit table is one of the tables emptied,
    // so an entry written first would delete itself. This leaves the wipe as the first and
    // only row in the new audit log, which is exactly the record that matters.
    await this.auditLog.record({
      actor,
      action: 'delete',
      entityType: 'database',
      entityId: 'public',
      before: {
        tablesCleared: tables.length,
        rowsDeleted,
        tables: tables.filter(t => t.rows > 0).map(t => `${t.table}: ${t.rows}`).join(', '),
      },
    });

    return { tables, rowsDeleted, tablesCleared: tables.length, completedAt };
  }

  /**
   * What is about to be lost, table by table.
   *
   * Uses an exact COUNT(*) rather than the planner's `reltuples` estimate: this number is
   * the receipt for an irreversible action, and "about 2,000" is not a receipt. The cost is
   * one sequential scan per table, which on a database this size is a fraction of a second.
   */
  async countRows(): Promise<{ table: string; rows: number }[]> {
    const names: { tablename: string }[] = await this.dataSource.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );

    const counted = await Promise.all(
      names.map(async ({ tablename }) => {
        // The name comes from the catalogue, not from a caller, but it is still
        // concatenated into SQL — so it goes through the same quoting Postgres itself
        // would apply, and a table called `"; DROP` stays a table name.
        const quoted = this.dataSource.driver.escape(tablename);
        const [{ count }] = await this.dataSource.query(`SELECT COUNT(*)::int AS count FROM public.${quoted}`);
        return { table: tablename, rows: Number(count) };
      }),
    );

    return counted.sort((a, b) => b.rows - a.rows || a.table.localeCompare(b.table));
  }
}
