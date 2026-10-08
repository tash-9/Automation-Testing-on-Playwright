import { APIRequestContext } from '@playwright/test';
import { ENV } from '../utils/env';

export interface MailMessage {
  id: string;
  snippet: string;
  /** Readable body text (plain part, or HTML with tags stripped). */
  text: string;
  /** Every http(s) link found in the e-mail. */
  links: string[];
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

/**
 * Reads e-mails sent by dMoney (login OTP, password-reset mail) through the
 * Gmail API. Because test users are registered as `name+agent123@gmail.com`
 * (plus-addressing), every mail lands in ONE inbox and we pick the right one
 * by filtering on the recipient address.
 */
export class GmailService {
  private cachedToken = '';
  private tokenExpiresAt = 0;

  constructor(
    private readonly request: APIRequestContext,
    private readonly cfg = ENV.gmail,
  ) {}

  // ---------------------------------------------------------------- auth ---

  private async accessToken(): Promise<string> {
    const { clientId, clientSecret, refreshToken, accessToken, tokenUrl } = this.cfg;

    if (clientId && clientSecret && refreshToken) {
      if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60_000) return this.cachedToken;
      const res = await this.request.post(tokenUrl, {
        form: {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        },
      });
      if (!res.ok()) throw new Error(`Gmail token refresh failed: ${res.status()} ${await res.text()}`);
      const body = await res.json();
      this.cachedToken = body.access_token;
      this.tokenExpiresAt = Date.now() + (body.expires_in ?? 3600) * 1000;
      return this.cachedToken;
    }

    if (accessToken) return accessToken;
    throw new Error(
      'Gmail is not configured. Set GMAIL_ACCESS_TOKEN (expires in ~1h) or GMAIL_CLIENT_ID + ' +
        'GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN in .env.',
    );
  }

  private async get(pathAndQuery: string) {
    const token = await this.accessToken();
    const res = await this.request.get(`${this.cfg.apiBase}${pathAndQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) throw new Error(`Gmail API error: ${res.status()} ${res.statusText()}`);
    return res.json();
  }

  // ------------------------------------------------------------ messages ---

  /** Ids of the newest messages sent to `toAddress` (newest first). */
  async listIds(toAddress: string): Promise<string[]> {
    const q = encodeURIComponent(`to:${toAddress}`);
    const body = await this.get(`/messages?q=${q}&maxResults=10`);
    return (body.messages ?? []).map((m: { id: string }) => m.id);
  }

  async getMessage(id: string): Promise<MailMessage> {
    const body = await this.get(`/messages/${id}?format=full`);
    const plain: string[] = [];
    const html: string[] = [];

    const walk = (part?: GmailPart) => {
      if (!part) return;
      const data = part.body?.data;
      if (data) {
        const decoded = Buffer.from(data, 'base64url').toString('utf8');
        if (part.mimeType === 'text/html') html.push(decoded);
        else if (part.mimeType === 'text/plain' || !part.mimeType) plain.push(decoded);
      }
      part.parts?.forEach(walk);
    };
    walk(body.payload);

    const rawAll = [...plain, ...html].join('\n');
    const links = new Set<string>();
    for (const m of rawAll.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
      links.add(m[0].replace(/&amp;/g, '&').replace(/[.,;]+$/, ''));
    }

    const stripped = html
      .join('\n')
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      id,
      snippet: body.snippet ?? '',
      text: plain.length ? plain.join('\n').trim() : stripped,
      links: [...links],
    };
  }

  /**
   * Waits until a message that was NOT in `knownIds` arrives for `toAddress`.
   * Take the snapshot (`listIds`) BEFORE the action that triggers the mail.
   */
  async waitForNewMessage(
    toAddress: string,
    knownIds: string[],
    { attempts = 30, intervalMs = 1500 }: { attempts?: number; intervalMs?: number } = {},
  ): Promise<MailMessage> {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const ids = await this.listIds(toAddress);
      const fresh = ids.find((id) => !knownIds.includes(id));
      if (fresh) return this.getMessage(fresh);
    }
    throw new Error(
      `No new e-mail for ${toAddress} within ${(attempts * intervalMs) / 1000}s ` +
        '(is the Gmail token valid and is the mail not in Spam?).',
    );
  }

  // ------------------------------------------------------------- parsing ---

  /** 4-6 digit one-time code. Prefers a number right after the words OTP/code. */
  static extractOtp(msg: Pick<MailMessage, 'text' | 'snippet'>): string {
    for (const source of [msg.text, msg.snippet]) {
      const near = source.match(/(?:otp|code|pin)\D{0,40}(\d{4,6})\b/i);
      if (near) return near[1];
    }
    const any = (msg.snippet || msg.text).match(/\b(\d{4})\b/);
    return any ? any[1] : '';
  }

  /** The password-reset link in the mail (falls back to the first portal link). */
  static extractResetLink(msg: Pick<MailMessage, 'links'>, portalHost: string): string {
    return (
      msg.links.find((l) => /reset|forgot|password|token/i.test(l)) ??
      msg.links.find((l) => l.includes(portalHost)) ??
      ''
    );
  }
}
