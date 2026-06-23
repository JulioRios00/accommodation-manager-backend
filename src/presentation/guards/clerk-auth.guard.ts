import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const roleCache = new Map<string, { role: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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
      const userId = payload.sub;
      const role = await this.resolveRole(userId);
      req.auth = { userId, role };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async resolveRole(userId: string): Promise<string> {
    const cached = roleCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.role;

    const user = await this.clerkClient.users.getUser(userId);
    const role = (user.publicMetadata?.role as string) ?? 'staff';
    roleCache.set(userId, { role, expiresAt: Date.now() + CACHE_TTL_MS });
    return role;
  }
}
