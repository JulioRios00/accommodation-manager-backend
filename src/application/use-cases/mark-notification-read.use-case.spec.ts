import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case';
import { Notification } from '../../domain/notification/notification.entity';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  const n = new Notification();
  Object.assign(n, {
    id: 'notif-1', residentId: 'resident-1', type: 'deposit_refund_completed',
    title: 'Deposit refund processed', message: 'msg', readAt: null, createdAt: new Date(),
  }, overrides);
  return n;
}

describe('MarkNotificationReadUseCase', () => {
  let repo: any;
  let useCase: MarkNotificationReadUseCase;

  beforeEach(() => {
    repo = {
      findById: jest.fn(async () => makeNotification()),
      save: jest.fn(async (n: any) => ({ ...n })),
    };
    useCase = new MarkNotificationReadUseCase(repo);
  });

  it('marks an unread notification as read', async () => {
    const result = await useCase.execute('notif-1', 'resident-1');
    expect(result.readAt).not.toBeNull();
  });

  it('is a no-op (no write) when already read', async () => {
    repo.findById.mockResolvedValue(makeNotification({ readAt: new Date() }));
    await useCase.execute('notif-1', 'resident-1');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects marking another resident\'s notification as read', async () => {
    await expect(useCase.execute('notif-1', 'someone-else')).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException for an unknown notification id', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'resident-1')).rejects.toThrow(NotFoundException);
  });
});
