import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportJobsService } from '../../application/services/import-jobs.service';
import { ImportIssueReportService } from '../../application/services/import-issue-report.service';

/** Only the two report routes; the import routes themselves are exercised elsewhere. */
function build() {
  const jobs = new ImportJobsService();
  const report = new ImportIssueReportService();
  const generate = jest.spyOn(report, 'generate');
  const controller = new ImportController(
    jobs, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, report,
  );
  const res = { setHeader: jest.fn(), send: jest.fn() } as any;
  return { controller, jobs, res, generate };
}

const skip = { identifier: '61RR', reason: 'Unrecognized bed number', sheet: 'Control', row: 58, value: 'Single' };

describe('ImportController issue report', () => {
  it('returns a spreadsheet for a finished job', async () => {
    const { controller, jobs, res } = build();
    const job = jobs.create();
    jobs.complete(job.id, { message: 'Imported 342 beds', skipReasons: [skip], tallies: [] });

    await controller.downloadIssueReport(job.id, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('import-issues-'));
    expect(Buffer.isBuffer(res.send.mock.calls[0][0])).toBe(true);
  });

  it('passes the stored run through rather than rebuilding it', async () => {
    const { controller, jobs, res, generate } = build();
    const job = jobs.create();
    jobs.complete(job.id, { message: 'Imported 342 beds', skipReasons: [skip], tallies: [] });

    await controller.downloadIssueReport(job.id, res);

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      summary: 'Imported 342 beds',
      skipReasons: [skip],
    }));
  });

  // Jobs are pruned an hour after finishing, so this is the ordinary "too late" case.
  it('404s for a job it no longer holds', async () => {
    const { controller, res } = build();
    await expect(controller.downloadIssueReport('nope', res)).rejects.toThrow(NotFoundException);
  });

  it('refuses while the import is still running', async () => {
    const { controller, jobs, res } = build();
    const job = jobs.create();
    await expect(controller.downloadIssueReport(job.id, res)).rejects.toThrow(BadRequestException);
  });

  it('still reports on a job that completed with nothing skipped', async () => {
    const { controller, jobs, res, generate } = build();
    const job = jobs.create();
    jobs.complete(job.id, { message: 'Imported 342 beds' });
    await controller.downloadIssueReport(job.id, res);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ skipReasons: [] }));
  });
});

describe('ImportController POST /import/report', () => {
  it('formats a result posted back by a synchronous import', async () => {
    const { controller, res, generate } = build();
    await controller.buildIssueReport({ message: 'Imported 10', skipReasons: [skip] }, res);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      summary: 'Imported 10',
      skipReasons: [expect.objectContaining({ identifier: '61RR', row: 58, value: 'Single' })],
    }));
    expect(Buffer.isBuffer(res.send.mock.calls[0][0])).toBe(true);
  });

  it('coerces whatever the client sent instead of trusting it', async () => {
    const { controller, res, generate } = build();
    await controller.buildIssueReport(
      { skipReasons: [{ identifier: 42, reason: null, row: 'twelve', value: '  padded  ', context: 'x'.repeat(900) }] },
      res,
    );
    const [{ skipReasons }] = generate.mock.calls[0];
    expect(skipReasons[0]).toMatchObject({ identifier: '42', reason: 'Not imported', value: 'padded' });
    expect(skipReasons[0].row).toBeUndefined();
    expect(skipReasons[0].context).toHaveLength(500);
  });

  it('accepts a body with no skipped rows at all', async () => {
    const { controller, res, generate } = build();
    await controller.buildIssueReport({}, res);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ skipReasons: [] }));
  });

  it('rejects a body too large to be a report anyone reads', async () => {
    const { controller, res } = build();
    const huge = Array.from({ length: 20001 }, () => skip);
    await expect(controller.buildIssueReport({ skipReasons: huge }, res)).rejects.toThrow(BadRequestException);
  });
});
