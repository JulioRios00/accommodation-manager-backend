import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor } from '../../application/services/audit-log.service';

/** The authenticated caller (set by ClerkAuthGuard on req.auth), for audit-log attribution. */
export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor | undefined => {
  const req = ctx.switchToHttp().getRequest();
  return req.auth ? { userId: req.auth.userId, role: req.auth.role } : undefined;
});
