import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const detail = (exception as any).detail as string | undefined;
    const message = (exception as any).message as string;

    this.logger.error(`QueryFailedError: ${message}`, exception.stack);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let clientMessage = 'A database error occurred. Please check your input and try again.';

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

    response.status(status).json({ statusCode: status, message: clientMessage });
  }
}
