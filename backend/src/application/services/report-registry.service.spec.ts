import { BadRequestException } from '@nestjs/common';
import { ReportRegistryService } from './report-registry.service';

describe('ReportRegistryService', () => {
  let registry: ReportRegistryService;

  beforeEach(() => {
    registry = new ReportRegistryService();
  });

  it('lists all v1 entities', () => {
    const keys = registry.listEntities().map((e) => e.key).sort();
    expect(keys).toEqual(
      ['beds', 'landlordAccounts', 'licenceAgreements', 'maintenanceOperations', 'properties', 'residents'].sort(),
    );
  });

  it('rejects an unknown entity', () => {
    expect(() => registry.getEntity('notReal')).toThrow(BadRequestException);
  });

  it('rejects an unknown field on a known entity', () => {
    expect(() => registry.getField('properties', 'notAField')).toThrow(BadRequestException);
  });

  it('backfills a plain column reference from the entity alias', () => {
    const field = registry.getField('properties', 'code');
    expect(field.column).toBe('property.code');
  });

  it('keeps a joined field\'s explicit column reference', () => {
    const field = registry.getField('beds', 'propertyCode');
    expect(field.column).toBe('property.code');
    expect(field.join).toEqual({ alias: 'property', relation: 'property' });
  });

  it('rejects an operator invalid for the field\'s type', () => {
    const stringField = registry.getField('properties', 'code');
    expect(() => registry.assertOperatorAllowed(stringField, '>')).toThrow(BadRequestException);
  });

  it('accepts an operator valid for the field\'s type', () => {
    const currencyField = registry.getField('beds', 'rentAmount');
    expect(() => registry.assertOperatorAllowed(currencyField, '>=')).not.toThrow();
  });

  it('rejects filtering on a field marked non-filterable', () => {
    jest.spyOn(registry, 'getField').mockReturnValueOnce({
      key: 'x', label: 'X', type: 'string', filterable: false, sortable: true, column: 'a.x',
    });
    expect(() => registry.getFilterableField('properties', 'x')).toThrow(BadRequestException);
  });

  it('rejects sorting on a field marked non-sortable', () => {
    jest.spyOn(registry, 'getField').mockReturnValueOnce({
      key: 'x', label: 'X', type: 'string', filterable: true, sortable: false, column: 'a.x',
    });
    expect(() => registry.getSortableField('properties', 'x')).toThrow(BadRequestException);
  });
});
