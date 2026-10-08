import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/** Reads an env var, falling back to a default when it is empty/undefined. */
function read(name: string, fallback = ''): string {
  const value = process.env[name]?.trim();
  return value === undefined || value === '' ? fallback : value;
}

/** Reads a numeric env var. */
function readNumber(name: string, fallback: number): number {
  const value = Number(read(name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

const systemDeposit = readNumber('SYSTEM_DEPOSIT_AMOUNT', 2000);
const customerDeposit = readNumber('CUSTOMER_DEPOSIT_AMOUNT', 500);
/** Agent commission on a customer cash-in. The live portal credits 2.5%. */
const commissionRate = readNumber('COMMISSION_RATE', 0.025);
const defaultBalanceAfterCashIn =
  systemDeposit - customerDeposit + customerDeposit * commissionRate;

export const ENV = {
  baseURL: read('BASE_URL', 'https://dmoneyportal.roadtocareer.net'),

  admin: {
    email: read('ADMIN_EMAIL', 'admin@dmoney.com'),
    password: read('ADMIN_PASSWORD', '1234'),
  },

  system: {
    email: read('SYSTEM_EMAIL', 'system@dmoney.com'),
    password: read('SYSTEM_PASSWORD', '1234'),
  },

  /** Password the agent registers with. */
  agentPassword: read('AGENT_PASSWORD', '1234'),
  /** Password the agent switches to during the reset-password step. */
  agentNewPassword: read('AGENT_NEW_PASSWORD', 'Reset@5678'),

  gmail: {
    /** Local-part of the Gmail address used for plus-addressing (before "@"). */
    baseLocal: read('GMAIL_BASE_LOCAL', ''),
    /** Short-lived token (expires in ~1h). Used only if no refresh token is given. */
    accessToken: read('GMAIL_ACCESS_TOKEN', ''),
    /** Optional: with these three the framework fetches fresh access tokens itself. */
    clientId: read('GMAIL_CLIENT_ID', ''),
    clientSecret: read('GMAIL_CLIENT_SECRET', ''),
    refreshToken: read('GMAIL_REFRESH_TOKEN', ''),
    /** Overridable so the framework can be dry-run against a local mock. */
    apiBase: read('GMAIL_API_BASE', 'https://gmail.googleapis.com/gmail/v1/users/me'),
    tokenUrl: read('GMAIL_TOKEN_URL', 'https://oauth2.googleapis.com/token'),
  },

  amounts: {
    systemDeposit,
    customerDeposit,
    commissionRate,
    /**
     * Agent balance after the customer cash-in.
     * Default is 2000 - 500 + (500 * 2.5%) = 1512.5.
     */
    agentBalanceAfterCashIn: readNumber(
      'EXPECTED_AGENT_BALANCE_AFTER_CASHIN',
      defaultBalanceAfterCashIn,
    ),
  },

  /** Phone number of an already-existing, active customer. */
  existingCustomerPhone: read('EXISTING_CUSTOMER_PHONE', '01711111111'),

  /** Folder where the Self Statement CSV is written. */
  outputDir: path.resolve(__dirname, '..', 'output'),

  /** Set RECORD_VIDEO=true to have Playwright record the whole journey. */
  recordVideo: read('RECORD_VIDEO', 'false').toLowerCase() === 'true',
  slowMo: readNumber('SLOW_MO', 0),
} as const;
