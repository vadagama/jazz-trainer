import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { totpSecrets, users } from '../db/schema.js';
import type { DrizzleDb } from '../db/index.js';

const DIGITS = 6;
const PERIOD_SEC = 30;
const WINDOW = 1; // ±1 step = 30s tolerance

// RFC 4648 base32 (uppercase, '=' padding)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str: string): Buffer {
  const cleaned = str.toUpperCase().replace(/=+$/, '');
  const bits: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]!);
    if (val === -1) throw new Error(`Invalid base32 char: ${cleaned[i]}`);
    bits.push(val);
  }
  const bytes: number[] = [];
  let buf = 0;
  let bufLen = 0;
  for (const b of bits) {
    buf = (buf << 5) | b;
    bufLen += 5;
    while (bufLen >= 8) {
      bytes.push((buf >> (bufLen - 8)) & 0xff);
      bufLen -= 8;
    }
  }
  return Buffer.from(bytes);
}

function base32Encode(buf: Buffer): string {
  let result = '';
  let bits = 0;
  let bitCount = 0;
  for (const byte of buf) {
    bits = (bits << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      result += BASE32_ALPHABET[(bits >> (bitCount - 5)) & 0x1f];
      bitCount -= 5;
    }
  }
  if (bitCount > 0) {
    result += BASE32_ALPHABET[(bits << (5 - bitCount)) & 0x1f];
  }
  // Pad to multiple of 8 chars
  const pad = (8 - (result.length % 8)) % 8;
  return result + '='.repeat(pad);
}

function computeTotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    (((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff)) %
    10 ** DIGITS;
  return code.toString().padStart(DIGITS, '0');
}

/** Generate a new TOTP secret (base32-encoded, 20 bytes). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** Build the otpauth:// URL for QR code generation. */
export function generateTotpUri(secret: string, email: string, issuer: string): string {
  const label = encodeURIComponent(email);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(PERIOD_SEC) });
  return `otpauth://totp/${issuer}:${label}?${params.toString()}`;
}

/** Verify a TOTP token within a ±WINDOW step tolerance. */
export function verifyTotpToken(secret: string, token: string): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  for (let i = -WINDOW; i <= WINDOW; i++) {
    const counter = Math.floor(nowSec / PERIOD_SEC) + i;
    if (computeTotp(secret, counter) === token) return true;
  }
  return false;
}

/** Setup: store a new TOTP secret for a user (pending enable). */
export function setupTotp(db: DrizzleDb, userId: string): { secret: string; otpauthUrl: string } {
  const secret = generateTotpSecret();
  const user = db.select({ email: users.email }).from(users).where(eq(users.id, userId)).get();
  const email = user?.email ?? userId;
  const otpauthUrl = generateTotpUri(secret, email, 'Jazz Trainer');

  const existing = db.select().from(totpSecrets).where(eq(totpSecrets.userId, userId)).get();
  if (existing) {
    db.update(totpSecrets)
      .set({ secret, enabled: false, updatedAt: Date.now() })
      .where(eq(totpSecrets.userId, userId))
      .run();
  } else {
    db.insert(totpSecrets)
      .values({ userId, secret, enabled: false, createdAt: Date.now(), updatedAt: Date.now() })
      .run();
  }
  return { secret, otpauthUrl };
}

/** Verify TOTP and enable it for the user (first-time setup). */
export function enableTotp(db: DrizzleDb, userId: string, token: string): boolean {
  const record = db.select().from(totpSecrets).where(eq(totpSecrets.userId, userId)).get();
  if (!record || record.enabled) return false;
  if (!verifyTotpToken(record.secret, token)) return false;
  db.update(totpSecrets)
    .set({ enabled: true, updatedAt: Date.now() })
    .where(eq(totpSecrets.userId, userId))
    .run();
  return true;
}

/** Check a TOTP token for an enabled user (login / step-up). */
export function checkTotp(db: DrizzleDb, userId: string, token: string): boolean {
  const record = db.select().from(totpSecrets).where(eq(totpSecrets.userId, userId)).get();
  if (!record || !record.enabled) return false;
  return verifyTotpToken(record.secret, token);
}

/** Whether the user has TOTP enabled. */
export function isTotpEnabled(db: DrizzleDb, userId: string): boolean {
  const record = db.select().from(totpSecrets).where(eq(totpSecrets.userId, userId)).get();
  return record?.enabled === true;
}

/** Disable TOTP for a user. */
export function disableTotp(db: DrizzleDb, userId: string): void {
  db.delete(totpSecrets).where(eq(totpSecrets.userId, userId)).run();
}


