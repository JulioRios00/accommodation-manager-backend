import { ResetDatabaseUseCase } from './reset-database.use-case';

function build() {
  const queries: string[] = [];
  const dataSource: any = {
    driver: { escape: (n: string) => `"${n}"` },
    query: jest.fn(async (sql: string) => {
      queries.push(sql);
      if (sql.includes('FROM pg_tables')) return [{ tablename: 'beds' }, { tablename: 'audit_logs' }];
      if (sql.includes('COUNT(*)')) return [{ count: sql.includes('"beds"') ? 342 : 7 }];
      return [];
    }),
  };
  const auditLog: any = { record: jest.fn(async () => undefined) };
  const useCase = new ResetDatabaseUseCase(dataSource, auditLog);
  jest.spyOn((useCase as any).logger, 'warn').mockImplementation(() => undefined);
  return { useCase, dataSource, auditLog, queries };
}

describe('ResetDatabaseUseCase', () => {
  it('counts what it is about to delete before deleting it', async () => {
    const { useCase, queries } = build();
    const res = await useCase.execute();
    expect(res.rowsDeleted).toBe(349);
    expect(res.tablesCleared).toBe(2);
    // Biggest table first: the receipt should lead with what mattered most.
    expect(res.tables[0]).toEqual({ table: 'beds', rows: 342 });
    const truncateAt = queries.findIndex(q => q.includes('TRUNCATE'));
    const countAt = queries.findIndex(q => q.includes('COUNT(*)'));
    expect(countAt).toBeLessThan(truncateAt);
  });

  it('truncates every public table in one statement', async () => {
    const { useCase, queries } = build();
    await useCase.execute();
    const truncates = queries.filter(q => q.includes('TRUNCATE'));
    // One DO block, not one statement per table: a partial wipe would leave the
    // application reading a database with foreign keys pointing at rows that had gone.
    expect(truncates).toHaveLength(1);
    expect(truncates[0]).toContain('RESTART IDENTITY CASCADE');
    expect(truncates[0]).toContain("schemaname = 'public'");
  });

  it('records the audit entry after the wipe, not before', async () => {
    const { useCase, auditLog, dataSource } = build();
    let truncatedAt = -1;
    let recordedAt = -1;
    let tick = 0;
    dataSource.query.mockImplementation(async (sql: string) => {
      if (sql.includes('TRUNCATE')) truncatedAt = tick++;
      if (sql.includes('FROM pg_tables')) return [{ tablename: 'beds' }];
      if (sql.includes('COUNT(*)')) return [{ count: 1 }];
      return [];
    });
    auditLog.record.mockImplementation(async () => { recordedAt = tick++; });

    await useCase.execute({ userId: 'user_1', role: 'sysadmin' });
    // audit_logs is one of the tables emptied, so an entry written first deletes itself.
    expect(truncatedAt).toBeGreaterThanOrEqual(0);
    expect(recordedAt).toBeGreaterThan(truncatedAt);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete',
        entityType: 'database',
        actor: { userId: 'user_1', role: 'sysadmin' },
      }),
    );
  });

  it('quotes table names from the catalogue rather than interpolating them raw', async () => {
    const { useCase, dataSource, queries } = build();
    dataSource.query.mockImplementation(async (sql: string) => {
      queries.push(sql);
      if (sql.includes('FROM pg_tables')) return [{ tablename: 'weird name' }];
      if (sql.includes('COUNT(*)')) return [{ count: 0 }];
      return [];
    });
    await useCase.execute();
    expect(queries.some(q => q.includes('FROM public."weird name"'))).toBe(true);
  });
});
