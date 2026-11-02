import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { OverdueEmailPreview } from '../use-cases/preview-overdue-emails.use-case';

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
const STATE_COLOUR: Record<OverdueEmailPreview['state'], string> = {
  'due to send': 'FF1B5E20',
  'already sent': 'FF616161',
  'no email address': 'FFC00000',
};

const TEMPLATE_LABEL: Record<OverdueEmailPreview['template'], string> = {
  d1_reminder: 'D+1 reminder',
  d4_urgent: 'D+4 final notice',
};

/**
 * The overdue-rent emails as a workbook, so they can be reviewed before they go out.
 *
 * The body is included in full rather than summarised: the point is to read the message a
 * resident will receive, in the words they will receive it.
 */
@Injectable()
export class OverdueEmailReportService {
  async generate(rows: OverdueEmailPreview[], generatedAt = new Date()): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Accommodation Manager';
    workbook.created = generatedAt;

    this.addEmailsSheet(workbook, rows);
    this.addSummarySheet(workbook, rows, generatedAt);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private addEmailsSheet(workbook: ExcelJS.Workbook, rows: OverdueEmailPreview[]) {
    const sheet = workbook.addWorksheet('Emails');
    sheet.columns = [
      { header: 'State', key: 'state', width: 18 },
      { header: 'Email', key: 'template', width: 18 },
      { header: 'Property', key: 'propertyCode', width: 12 },
      { header: 'Resident', key: 'residentName', width: 26 },
      { header: 'Address', key: 'email', width: 30 },
      { header: 'Month', key: 'month', width: 10 },
      { header: 'Due date', key: 'dueDate', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Days overdue', key: 'daysOverdue', width: 14 },
      { header: 'Rent (€)', key: 'rentAmount', width: 12, style: { numFmt: '€#,##0.00' } },
      { header: 'Paid (€)', key: 'amountPaid', width: 12, style: { numFmt: '€#,##0.00' } },
      { header: 'Owed (€)', key: 'amountDue', width: 12, style: { numFmt: '€#,##0.00' } },
      { header: 'Sent on', key: 'sentAt', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Subject', key: 'subject', width: 52 },
      { header: 'Message', key: 'body', width: 90 },
    ];
    this.styleHeader(sheet, 14);

    for (const r of rows) {
      const added = sheet.addRow({
        state: r.state,
        template: TEMPLATE_LABEL[r.template],
        propertyCode: r.propertyCode,
        residentName: r.residentName,
        // Say so in the cell rather than leaving a blank that reads as a formatting slip.
        email: r.email ?? 'none on file',
        month: r.month,
        dueDate: r.dueDate,
        daysOverdue: r.daysOverdue,
        rentAmount: r.rentAmount,
        amountPaid: r.amountPaid,
        amountDue: r.amountDue,
        sentAt: r.sentAt ?? null,
        subject: r.subject,
        body: r.body,
      });
      added.getCell('state').font = { bold: true, color: { argb: STATE_COLOUR[r.state] } };
      // The body is the reason this file exists, so let it wrap instead of trailing off.
      added.getCell('body').alignment = { wrapText: true, vertical: 'top' };
      added.getCell('subject').alignment = { wrapText: true, vertical: 'top' };
    }

    if (rows.length === 0) {
      const row = sheet.addRow({ state: 'No overdue rent — no emails to send.' });
      row.font = { italic: true };
      sheet.mergeCells(row.number, 1, row.number, 14);
    } else {
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 14 } };
    }
  }

  private addSummarySheet(workbook: ExcelJS.Workbook, rows: OverdueEmailPreview[], generatedAt: Date) {
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [
      { header: 'Measure', key: 'measure', width: 34 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Total owed (€)', key: 'owed', width: 16, style: { numFmt: '€#,##0.00' } },
    ];
    this.styleHeader(sheet, 3);

    const group = (predicate: (r: OverdueEmailPreview) => boolean) => {
      const matched = rows.filter(predicate);
      // One payment can appear twice (reminder and final notice), so money is summed over
      // distinct payments — otherwise the total silently double-counts.
      const seen = new Set<string>();
      let owed = 0;
      for (const r of matched) {
        const id = `${r.propertyCode}|${r.residentName}|${r.month}`;
        if (seen.has(id)) continue;
        seen.add(id);
        owed += r.amountDue;
      }
      return { count: matched.length, owed };
    };

    const measures: [string, (r: OverdueEmailPreview) => boolean][] = [
      ['Due to send', r => r.state === 'due to send'],
      ['  of which D+1 reminders', r => r.state === 'due to send' && r.template === 'd1_reminder'],
      ['  of which D+4 final notices', r => r.state === 'due to send' && r.template === 'd4_urgent'],
      ['Already sent', r => r.state === 'already sent'],
      ['Overdue but no email address', r => r.state === 'no email address'],
    ];
    for (const [measure, predicate] of measures) {
      const { count, owed } = group(predicate);
      sheet.addRow({ measure, count, owed });
    }

    sheet.addRow({});
    const stamp = sheet.addRow({ measure: `Generated ${generatedAt.toLocaleString('en-IE')} — nothing has been sent.` });
    stamp.font = { italic: true };
  }

  private styleHeader(sheet: ExcelJS.Worksheet, columns: number) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = HEADER_FILL;
    void columns;
  }
}
