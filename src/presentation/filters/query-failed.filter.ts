import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import * as Sentry from '@sentry/nestjs';

// Postgres SQLSTATE codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_STRING_DATA_RIGHT_TRUNCATION = '22001';
const PG_NOT_NULL_VIOLATION = '23502';
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';
const PG_INVALID_DATETIME_FORMAT = '22007';
const PG_DATETIME_FIELD_OVERFLOW = '22008';

function humanizeColumn(column?: string): string | null {
  if (!column) return null;
  const spaced = column.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    // TypeORM's QueryFailedError copies the raw pg driver error's fields (code, column,
    // table, constraint, detail) directly onto itself.
    const { code, column, table, constraint, detail } = exception as unknown as {
      code?: string;
      column?: string;
      table?: string;
      constraint?: string;
      detail?: string;
    };
    const message = exception.message;

    this.logger.error(`QueryFailedError [${code ?? 'unknown'}] on ${table ?? 'unknown table'}: ${message}`, exception.stack);

    // This filter fully handles QueryFailedError before Nest's SentryGlobalFilter ever
    // sees it (global filters are matched in reverse registration order), so it must
    // report to Sentry itself or these errors go completely unobserved.
    Sentry.captureException(exception, {
      tags: { pgErrorCode: code ?? 'unknown', table: table ?? 'unknown', constraint: constraint ?? 'unknown' },
      extra: { column, detail },
    });

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let clientMessage = 'A database error occurred. Please check your input and try again.';

    switch (code) {
      case PG_STRING_DATA_RIGHT_TRUNCATION: {
        // Postgres never reports a column for this error class, even on a clean INSERT,
        // so there is no field name to surface here.
        status = HttpStatus.BAD_REQUEST;
        clientMessage = 'One or more fields exceed the maximum allowed length. Please shorten the longest one and try again.';
        break;
      }
      case PG_NOT_NULL_VIOLATION: {
        const field = humanizeColumn(column);
        status = HttpStatus.BAD_REQUEST;
        clientMessage = field ? `${field} is required.` : 'A required field is missing.';
        break;
      }
      case PG_UNIQUE_VIOLATION:
        status = HttpStatus.CONFLICT;
        clientMessage = detail ?? 'A record with these details already exists.';
        break;
      case PG_FOREIGN_KEY_VIOLATION:
        status = HttpStatus.BAD_REQUEST;
        clientMessage = detail ?? 'Referenced record does not exist.';
        break;
      case PG_INVALID_TEXT_REPRESENTATION:
      case PG_INVALID_DATETIME_FORMAT:
      case PG_DATETIME_FIELD_OVERFLOW: {
        const field = humanizeColumn(column);
        status = HttpStatus.BAD_REQUEST;
        clientMessage = field
          ? `${field} contains an invalid value (e.g. a date field left partially filled).`
          : 'One or more fields contain an invalid value (e.g. a date field was left partially filled).';
        break;
      }
      case PG_CHECK_VIOLATION:
        status = HttpStatus.BAD_REQUEST;
        clientMessage = constraint
          ? `The value provided is not allowed by the "${constraint}" rule.`
          : 'One or more fields contain an invalid value.';
        break;
      default:
        // Older/self-hosted pg setups or drivers that don't surface a SQLSTATE code
        // fall back to matching the raw message text.
        if (message.includes('value too long')) {
          status = HttpStatus.BAD_REQUEST;
          clientMessage = 'One or more fields exceed the maximum allowed length.';
        } else if (message.includes('duplicate key') || message.includes('unique constraint')) {
          status = HttpStatus.CONFLICT;
          clientMessage = detail ?? 'A record with these details already exists.';
        } else if (message.includes('violates not-null') || message.includes('null value in column')) {
          status = HttpStatus.BAD_REQUEST;
          clientMessage = 'A required field is missing.';
        } else if (message.includes('violates foreign key')) {
          status = HttpStatus.BAD_REQUEST;
          clientMessage = detail ?? 'Referenced record does not exist.';
        } else if (message.includes('invalid input syntax for type')) {
          status = HttpStatus.BAD_REQUEST;
          clientMessage = 'One or more fields contain an invalid value (e.g. a date field was left partially filled).';
        }
    }

    response.status(status).json({ statusCode: status, message: clientMessage });
  }
}
