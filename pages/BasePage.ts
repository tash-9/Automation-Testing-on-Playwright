import { Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async goto(pathname: string): Promise<void> {
    await this.page.goto(pathname);
  }
}
