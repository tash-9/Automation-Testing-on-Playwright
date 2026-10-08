import fs from 'fs';
import path from 'path';
import { todayLocal } from './DateUtil';

export interface TableData {
  headers: string[];
  rows: string[][];
}

/** Escapes one CSV field (RFC 4180): quote when it has , " or a line break. */
function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv({ headers, rows }: TableData): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeField).join(','));
  return lines.join('\n') + '\n';
}

/** Minimal RFC 4180 parser - used to read the saved file back and verify it. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      out.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out;
}

/** self_statement_2026-10-02.csv */
export function selfStatementFileName(date: Date = new Date()): string {
  return `self_statement_${todayLocal(date)}.csv`;
}

/** Writes the table to <outputDir>/self_statement_<today>.csv and returns the full path. */
export function saveSelfStatementCsv(data: TableData, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, selfStatementFileName());
  fs.writeFileSync(filePath, toCsv(data), 'utf8');
  return filePath;
}
