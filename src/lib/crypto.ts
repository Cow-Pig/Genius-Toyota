import crypto from 'crypto';

export type EncryptedPayload = {
  iv: string;
  content: string;
  authTag: string;
};

type MaskOptions = {
  prefix?: number;
  suffix?: number;
  maskChar?: string;
};

function resolveKey(): Buffer {
  const rawKey = process.env.DATA_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_DATA_ENCRYPTION_KEY;

  const material = rawKey && rawKey.trim().length > 0 ? rawKey : 'development-finance-navigator-key';

  return crypto.createHash('sha256').update(material).digest();
}

const key = resolveKey();

export function encryptPayload<T>(value: T): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const serialized = JSON.stringify(value);
  const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    content: encrypted.toString('base64'),
    authTag: authTag.toString('base64'),
  } satisfies EncryptedPayload;
}

export function decryptPayload<T>(payload: EncryptedPayload): T {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.content, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8')) as T;
}

export function maskValue(value: string, options: MaskOptions = {}): string {
  const { prefix = 2, suffix = 2, maskChar = '•' } = options;
  if (!value) {
    return '';
  }

  if (value.length <= prefix + suffix) {
    return maskChar.repeat(Math.max(0, value.length - 1));
  }

  const start = value.slice(0, prefix);
  const end = value.slice(-suffix);
  const masked = maskChar.repeat(Math.max(0, value.length - prefix - suffix));

  return `${start}${masked}${end}`;
}

export function maskEmail(email: string): string {
  if (!email) {
    return '';
  }

  const [local, domain] = email.split('@');
  if (!domain) {
    return maskValue(email, { prefix: 1, suffix: 1 });
  }

  const maskedLocal = maskValue(local, { prefix: 1, suffix: Math.min(1, Math.max(0, local.length - 2)) });
  const [domainName, tld] = domain.split('.');
  if (!domainName || !tld) {
    return `${maskedLocal}@${maskValue(domain, { prefix: 1, suffix: 1 })}`;
  }

  return `${maskedLocal}@${maskValue(domainName, { prefix: 1, suffix: 1 })}.${tld}`;
}

export function redactValue(value: string): string {
  return value ? '••••' : '';
}
