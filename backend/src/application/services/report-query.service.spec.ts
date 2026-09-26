import { BadRequestException } from '@nestjs/common';
import { ReportQueryService } from './report-query.service';
import { ReportRegistryService } from './report-registry.service';
import { ReportQueryRequest } from '../../domain/custom-report/report-metadata.types';

function makeMockQueryBuilder(rows: Record<string, unknown>[], total: number) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(total),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
}

function makeMockRepo(qb: ReturnType<typeof makeMockQueryBuilder>) {
  return { createQueryBuilder: jest.fn().mockReturnValue(qb) } as any;
}

describe('ReportQueryService', () => {
  let registry: ReportRegistryService;
  let qb: ReturnType<typeof makeMockQueryBuilder>;
  let service: ReportQueryService;

  beforeEach(() => {
    registry = new ReportRegistryService();
    qb = makeMockQueryBuilder([{ code: '61RR' }], 1);
    const repo = makeMockRepo(qb);
    service = new ReportQueryService(repo, repo, repo, repo, repo, repo, registry);
  });

  it('rejects an unknown entity before touching the DB', async () => {
    const request: ReportQueryRequest = { entity: 'notReal' as any, fields: ['code'], filters: [], sort: [] };
    await expect(service.run(request, 500)).rejects.toThrow(BadRequestException);
  });

  it('rejects an unknown field before touching the DB', async () => {
    const request: ReportQueryRequest = { entity: 'properties', fields: ['notAField'], filters: [], sort: [] };
    await expect(service.run(request, 500)).rejects.toThrow(BadRequestException);
  });

  it('rejects a filter operator invalid for the field type', async () => {
    const request: ReportQueryRequest = {
      entity: 'properties',
      fields: ['code'],
      filters: [{ field: 'code', operator: '>', value: 'x' }],
      sort: [],
    };
    await expect(service.run(request, 500)).rejects.toThrow(BadRequestException);
  });

  it('rejects filtering on a field not selected in the metadata registry', async () => {
    const request: ReportQueryRequest = {
      entity: 'properties',
      fields: ['code'],
      filters: [{ field: 'notAField', operator: '=', value: 'x' }],
      sort: [],
    };
    await expect(service.run(request, 500)).rejects.toThrow(BadRequestException);
  });

  it('combines multiple filters with AND, one andWhere call per filter', async () => {
    const request: ReportQueryRequest = {
      entity: 'properties',
      fields: ['code', 'bu'],
      filters: [
        { field: 'bu', operator: '=', value: 'SA' },
        { field: 'active', operator: '=', value: true },
      ],
      sort: [],
    };
    await service.run(request, 500);
    expect(qb.andWhere).toHaveBeenCalledTimes(2);
    expect(qb.andWhere).toHaveBeenCalledWith('property.bu = :f0', { f0: 'SA' });
    expect(qb.andWhere).toHaveBeenCalledWith('property.active = :f1', { f1: true });
  });

  it('parameterizes filter values rather than concatenating them into the SQL string', async () => {
    const request: ReportQueryRequest = {
      entity: 'properties',
      fields: ['code'],
      filters: [{ field: 'code', operator: 'contains', value: "'; DROP TABLE properties; --" }],
      sort: [],
    };
    await service.run(request, 500);
    const [sql] = qb.andWhere.mock.calls[0];
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toBe('property.code ILIKE :f0');
  });

  it('applies multi-key sort in the given order', async () => {
    const request: ReportQueryRequest = {
      entity: 'properties',
      fields: ['code'],
      filters: [],
      sort: [
        { field: 'bu', direction: 'ASC' },
        { field: 'code', direction: 'DESC' },
      ],
    };
    await service.run(request, 500);
    expect(qb.addOrderBy).toHaveBeenNthCalledWith(1, 'property.bu', 'ASC');
    expect(qb.addOrderBy).toHaveBeenNthCalledWith(2, 'property.code', 'DESC');
  });

  it('adds a left join once for a joined field even if used in both select and filter', async () => {
    const request: ReportQueryRequest = {
      entity: 'beds',
      fields: ['bedNumber', 'propertyCode'],
      filters: [{ field: 'propertyCode', operator: '=', value: '61RR' }],
      sort: [],
    };
    await service.run(request, 500);
    expect(qb.leftJoin).toHaveBeenCalledTimes(1);
    expect(qb.leftJoin).toHaveBeenCalledWith('bed.property', 'property');
  });

  it('reports capped:true when total exceeds the requested cap', async () => {
    qb.getCount.mockResolvedValue(600);
    const request: ReportQueryRequest = { entity: 'properties', fields: ['code'], filters: [], sort: [] };
    const result = await service.run(request, 500);
    expect(result.capped).toBe(true);
    expect(qb.take).toHaveBeenCalledWith(500);
  });
});
