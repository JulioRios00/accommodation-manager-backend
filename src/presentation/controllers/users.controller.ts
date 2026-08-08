import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { Roles } from '../decorators/roles.decorator';

@Controller('users')
@Roles('sysadmin', 'manager')
export class UsersController {
  private clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  @Get()
  async listUsers() {
    const { data } = await this.clerk.users.getUserList({ limit: 200, orderBy: '-created_at' });
    return data.map(u => ({
      id: u.id,
      fullName: [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.emailAddresses[0]?.emailAddress ?? '—'),
      email: u.emailAddresses[0]?.emailAddress ?? '',
      role: (u.publicMetadata?.role as string) ?? 'staff',
      imageUrl: u.imageUrl,
      createdAt: u.createdAt,
    }));
  }

  @Patch(':id')
  async updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    const allowed = ['sysadmin', 'manager', 'administrator', 'staff', 'resident', 'maintenance'];
    if (!allowed.includes(body.role)) {
      throw new Error(`Invalid role: ${body.role}`);
    }
    await this.clerk.users.updateUserMetadata(id, { publicMetadata: { role: body.role } });
    return { ok: true };
  }
}
