import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { Navigation } from './Navigation';
import { TableData } from '../utils/CsvUtil';
import { amountPattern } from '../utils/AmountUtil';

/** "Self Statement" - the transaction history table of the logged-in user. */
export class StatementPage extends BasePage {
  /** Used only if the menu entry cannot be found. */
  private static readonly FALLBACK_PATHS = [
    '/agent/statement',
    '/agent/self-statement',
    '/statement',
    '/self-statement',
  ];

  private get table(): Locator {
    return this.page.locator('table, [role="table"], [role="grid"]').first();
  }
  private get nextButton(): Locator {
    return this.page.getByRole('button', { name: /^(go to )?next( page)?$/i });
  }

  async open(): Promise<void> {
    const link = new Navigation(this.page).selfStatementLink;
    const linkFound = await link
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (linkFound) {
      await link.click();
    } else {
      for (const p of StatementPage.FALLBACK_PATHS) {
        await this.goto(p);
        if (await this.table.isVisible().catch(() => false)) break;
      }
    }
    await expect(this.table).toBeVisible({ timeout: 20_000 });
    await expect(this.dataRows).not.toHaveCount(0, { timeout: 20_000 });
  }

  /** Rows that hold data (not the header row). */
  private get dataRows(): Locator {
    return this.table.locator('tbody tr, [role="row"]:has([role="cell"]), [role="row"]:has([role="gridcell"])');
  }

  /** Reads the table as currently shown (one page). */
  private async readVisible(): Promise<TableData> {
    return this.table.evaluate((el) => {
      const clean = (n: Element) => (n.textContent ?? '').replace(/\s+/g, ' ').trim();
      let headers: string[] = [];
      const rows: string[][] = [];
      for (const r of Array.from(el.querySelectorAll('tr, [role="row"]'))) {
        const heads = r.querySelectorAll('th, [role="columnheader"]');
        const cells = r.querySelectorAll('td, [role="cell"], [role="gridcell"]');
        if (heads.length && !cells.length) {
          if (!headers.length) headers = Array.from(heads).map(clean);
        } else if (cells.length) {
          rows.push(Array.from(cells).map(clean));
        }
      }
      return { headers, rows };
    });
  }

  /**
   * Reads EVERY row of the table, following the pagination "Next" button.
   * `maxPages` only exists for huge shared tables (e.g. the System account).
   */
  async extractAll(maxPages = 200): Promise<TableData> {
    const all: TableData = { headers: [], rows: [] };

    for (let pageNo = 0; pageNo < maxPages; pageNo++) {
      const current = await this.readVisible();
      if (!all.headers.length) all.headers = current.headers;

      // Skip "No data" placeholder rows (a single cell in a multi-column table).
      const real = current.rows.filter((r) => !(all.headers.length > 1 && r.length === 1));
      all.rows.push(...real);

      const hasNext = await this.nextButton.first().isVisible().catch(() => false);
      if (!hasNext || (await this.nextButton.first().isDisabled())) break;

      const before = JSON.stringify(current.rows);
      await this.nextButton.first().click();
      try {
        await expect
          .poll(async () => JSON.stringify((await this.readVisible()).rows), { timeout: 8_000 })
          .not.toBe(before);
      } catch {
        break; // page did not change -> nothing more to read
      }
    }

    // A header-less table still needs column names for the CSV.
    if (!all.headers.length && all.rows.length) {
      all.headers = all.rows[0].map((_, i) => `column_${i + 1}`);
    }
    return all;
  }

  /**
   * True when some row mentions `amount` and - if `anyOf` is given - also at
   * least one of those texts (e.g. the counterparty's phone number or name).
   */
  static hasRowWith(data: TableData, amount: number, anyOf: string[] = []): boolean {
    const pattern = amountPattern(amount);
    return data.rows.some((r) => {
      const line = r.join(' | ');
      return pattern.test(line) && (!anyOf.length || anyOf.some((t) => line.includes(t)));
    });
  }
}
