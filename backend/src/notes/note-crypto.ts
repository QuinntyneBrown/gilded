import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  keyId: string;
}

export interface PublicPayload {
  body: string;
  ciphertext?: undefined;
}

export class NoteCrypto {
  private readonly masterKey: Buffer;

  constructor(masterKeyHex: string) {
    this.masterKey = Buffer.from(masterKeyHex, 'hex');
  }

  private deriveKey(keyId: string): Buffer {
    const hmac = createHmac('sha256', this.masterKey);
    hmac.update(Buffer.from(keyId, 'utf8'));
    return hmac.digest();
  }

  encrypt(plaintext: string, keyId: string): EncryptedPayload {
    const key = this.deriveKey(keyId);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const ciphertext = Buffer.concat([enc, tag]).toString('base64');
    return { ciphertext, iv: iv.toString('base64'), keyId };
  }

  decrypt({ ciphertext, iv, keyId }: EncryptedPayload): string {
    const key = this.deriveKey(keyId);
    const ivBuf = Buffer.from(iv, 'base64');
    const data = Buffer.from(ciphertext, 'base64');
    const tag = data.subarray(data.length - 16);
    const enc = data.subarray(0, data.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, ivBuf);
    decipher.setAuthTag(tag);
    return decipher.update(enc).toString('utf8') + decipher.final('utf8');
  }

  storePublic(body: string): PublicPayload {
    return { body };
  }
}
