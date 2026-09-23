// تشفير بسيط (AES-256-GCM) لأي قيمة حساسة لازم تتخزن في القاعدة — استخدامه الأول هنا:
// توكنات OAuth بتاعة الحسابات المربوطة (src/db/schema.ts → connectedAccounts).
// مفتاح التشفير من ENCRYPTION_KEY (env) — لازم يكون ٣٢ بايت (64 hex char). لو مش متظبط،
// بنرمي error واضح بدل ما نخزن توكنات خام بصمت (خط أحمر: التزام حوكمة الخصوصية).
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY غير متظبط أو غير صحيح — لازم يكون 64 حرف hex (٣٢ بايت). شغّل: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

// الناتج: base64(iv (12 بايت) + authTag (16 بايت) + ciphertext) — نص واحد قابل للتخزين في عمود text.
export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
