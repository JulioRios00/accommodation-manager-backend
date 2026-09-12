import { extractVariables, unsupportedVariables, renderTemplate } from './email-template-renderer';

describe('extractVariables', () => {
  it('finds all {{var}} tokens, deduped', () => {
    expect(extractVariables('Hi {{residentName}}, you owe {{amountDue}}. Regards, {{residentName}}.')).toEqual([
      'residentName', 'amountDue',
    ]);
  });

  it('returns empty for plain text', () => {
    expect(extractVariables('no placeholders here')).toEqual([]);
  });
});

describe('unsupportedVariables', () => {
  it('accepts all known variables', () => {
    expect(unsupportedVariables('{{residentName}} owes {{amountDue}} due {{dueDate}}, {{daysOverdue}} days overdue')).toEqual([]);
  });

  it('rejects an unknown variable', () => {
    expect(unsupportedVariables('Hi {{residentName}}, your {{secretField}} is due')).toEqual(['secretField']);
  });
});

describe('renderTemplate', () => {
  it('substitutes known variables', () => {
    expect(renderTemplate('Hi {{residentName}}, {{amountDue}} due', { residentName: 'Ana', amountDue: '€470.00' }))
      .toBe('Hi Ana, €470.00 due');
  });

  it('leaves an unmatched token as-is rather than dropping it silently', () => {
    expect(renderTemplate('Hi {{residentName}}', {})).toBe('Hi {{residentName}}');
  });
});
