import { BadRequestException, Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Actor } from '../../application/services/audit-log.service';
import { RESET_CONFIRMATION, ResetDatabaseUseCase } from '../../application/use-cases/reset-database.use-case';

/**
 * Operations that are not part of running the business and that nobody should reach by
 * accident. Sysadmin only — not manager, which otherwise has the run of the application.
 */
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly resetDatabase: ResetDatabaseUseCase) {}

  /** What a reset would destroy, so the confirmation can state it rather than imply it. */
  @Get('database-contents')
  @Roles('sysadmin')
  async databaseContents() {
    const tables = await this.resetDatabase.countRows();
    return { tables, rowsTotal: tables.reduce((sum, t) => sum + t.rows, 0) };
  }

  /**
   * Empties every table. Irreversible from here: the only way back is a Neon
   * point-in-time restore, so the caller has to type the confirmation phrase.
   */
  @Post('reset-database')
  @Roles('sysadmin')
  async reset(@Body('confirm') confirm: unknown, @CurrentActor() actor?: Actor) {
    if (confirm !== RESET_CONFIRMATION) {
      // Deliberately refused before anything is read or written. The phrase is in the
      // message because this is a developer-facing 400, not something a user will see —
      // the UI sends the phrase itself.
      this.logger.warn(`[admin] reset-database refused: confirmation phrase missing or wrong (${actor?.userId ?? 'unknown'})`);
      throw new BadRequestException(`Confirmation phrase required: send { "confirm": "${RESET_CONFIRMATION}" }`);
    }

    const result = await this.resetDatabase.execute(actor);
    return {
      ...result,
      message:
        `Database emptied: ${result.rowsDeleted} rows removed from ${result.tablesCleared} tables. ` +
        `Import your spreadsheets again to repopulate it.`,
    };
  }
}
