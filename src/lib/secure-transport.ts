const DEFAULT_SECRET =
  process.env.NEXT_PUBLIC_TRANSPORT_ENCRYPTION_KEY ??
  process.env.NEXT_PUBLIC_DATA_ENCRYPTION_KEY ??
  process.env.DATA_ENCRYPTION_KEY ??
  'development-finance-navigator-key';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecretMaterial(): string {
  return DEFAULT_SECRET;
}

type CryptoLike = {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
};

let cachedCrypto: CryptoLike | null = null;

async function resolveCrypto(): Promise<CryptoLike> {
  if (cachedCrypto) {
    return cachedCrypto;
  }

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto?.subtle) {
    cachedCrypto = globalThis.crypto as CryptoLike;
    return cachedCrypto;
  }

  if (typeof window === 'undefined') {
    const { webcrypto } = await import('crypto');
    cachedCrypto = webcrypto as unknown as CryptoLike;
    return cachedCrypto;
  }

  throw new Error('Secure crypto APIs are not available in this environment.');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  return Buffer.from(buffer).toString('base64');
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  return Uint8Array.from(Buffer.from(base64, 'base64')).buffer;
}

let cachedKeyPromise: Promise<CryptoKey> | null = null;

async function resolveKey(subtle: SubtleCrypto): Promise<CryptoKey> {
  if (!cachedKeyPromise) {
    cachedKeyPromise = (async () => {
      const secret = getSecretMaterial();
      const material = encoder.encode(secret);
      const digest = await subtle.digest('SHA-256', material);
      return subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    })();
  }

  return cachedKeyPromise;
}

export type TransportEnvelope = {
  version: 'v1';
  algorithm: 'AES-256-GCM';
  iv: string;
  ciphertext: string;
};

export function isTransportEnvelope(value: unknown): value is TransportEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TransportEnvelope>;
  return (
    candidate.version === 'v1' &&
    candidate.algorithm === 'AES-256-GCM' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.ciphertext === 'string'
  );
}

export async function sealTransportPayload(payload: unknown): Promise<TransportEnvelope> {
  const cryptoLike = await resolveCrypto();
  const key = await resolveKey(cryptoLike.subtle);
  const iv = cryptoLike.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(payload));
  const encrypted = await cryptoLike.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    version: 'v1',
    algorithm: 'AES-256-GCM',
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(encrypted),
  };
}

export async function openTransportPayload<T = unknown>(envelope: TransportEnvelope): Promise<T> {
  const cryptoLike = await resolveCrypto();
  const key = await resolveKey(cryptoLike.subtle);
  const ivBuffer = base64ToArrayBuffer(envelope.iv);
  const cipherBuffer = base64ToArrayBuffer(envelope.ciphertext);
  const decrypted = await cryptoLike.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    key,
    cipherBuffer,
  );
  const decoded = decoder.decode(decrypted);
  return JSON.parse(decoded) as T;
}
