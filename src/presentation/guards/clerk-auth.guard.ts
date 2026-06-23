import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      req.auth = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
