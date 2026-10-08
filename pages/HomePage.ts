import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/** The public landing page (`/`). */
export class HomePage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/');
  }

  /** Clicks the "Sign Up" button in the header and lands on the register page. */
  async clickSignUp(): Promise<void> {
    await this.page.getByRole('link', { name: 'Sign Up', exact: true }).first().click();
    await expect(this.page).toHaveURL(/\/register/);
  }
}

