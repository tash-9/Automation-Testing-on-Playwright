import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { AgentData } from '../utils/TestDataGenerator';


export class RegisterPage extends BasePage {
  private get fullName(): Locator {
    return this.page.getByRole('textbox', { name: 'Full Name' });
  }
  private get email(): Locator {
    return this.page.getByRole('textbox', { name: 'Email Address' });
  }
  private get password(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }
  private get phone(): Locator {
    return this.page.getByRole('textbox', { name: 'Phone Number' });
  }
  private get nid(): Locator {
    return this.page.getByRole('textbox', { name: 'National ID (NID)' });
  }
  private get roleSelect(): Locator {
    return this.page.getByRole('combobox');
  }
  private get submit(): Locator {
    return this.page.getByRole('button', { name: /Create Account/ });
  }

  async open(): Promise<void> {
    await this.goto('/register');
    await expect(this.page.getByText('Create an Account')).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/register/);
    await expect(this.page.getByText('Create an Account')).toBeVisible();
  }

  async selectRole(role: string): Promise<void> {
    await this.roleSelect.click();
    await this.page.getByRole('option', { name: new RegExp(role, 'i') }).click();
  }

  async register(agent: AgentData, role = 'Agent'): Promise<void> {
    await this.fullName.fill(agent.fullName);
    await this.email.fill(agent.email);
    await this.password.fill(agent.password);
    await this.phone.fill(agent.phone);
    await this.nid.fill(agent.nid);
    await this.selectRole(role);
    await this.submit.click();
  }

  async expectRegistrationSuccess(): Promise<void> {
    await expect(this.page.getByText(/Registration successful/i)).toBeVisible();
  }
}
