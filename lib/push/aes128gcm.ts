import { createCipheriv, createECDH, createHmac, randomBytes } from "node:crypto";

/**
 * Message encryption for Web Push, RFC 8291 over the RFC 8188 content encoding.
 *
 * A browser's push service is a third party. It relays the message and it must
 * not be able to read it, so the body is encrypted end to end against two values
 * the browser handed over when it subscribed: `p256dh`, its ECDH public key, and
 * `auth`, a shared secret. Neither the push service nor anybody who intercepts
 * the request can derive the key without them.
 *
 * This is written out rather than pulled from a library because it is eighty
 * lines of standard primitives, and because the RFC publishes a worked example -
 * so the implementation is checked against the specification's own bytes rather
 * than against itself. See tests/web-push.test.ts.
 */

const utf8 = (value: string) => Buffer.from(value, "utf8");

/** base64url, the encoding every value in a push subscription arrives in. */
export const fromBase64Url = (value: string) => Buffer.from(value, "base64url");
export const toBase64Url = (value: Buffer) => value.toString("base64url");

// HKDF, the two halves stated separately because RFC 8291 uses the extract step
// on its own once before it ever expands.
const extract = (salt: Buffer, ikm: Buffer) => createHmac("sha256", salt).update(ikm).digest();
const expand = (prk: Buffer, info: Buffer, length: number) =>
  createHmac("sha256", prk).update(Buffer.concat([info, Buffer.from([1])])).digest().subarray(0, length);

/** The record size. One record is enough: a notification is a few hundred bytes. */
export const RECORD_SIZE = 4096;

export type PushKeys = Readonly<{ p256dh: string; auth: string }>;

export type EncryptedPush = Readonly<{
  /** The request body: the RFC 8188 header followed by one encrypted record. */
  body: Buffer;
  /** The application server's own public key, which the header also carries. */
  serverPublicKey: Buffer;
}>;

/**
 * `salt` and `serverKeys` are parameters only so the RFC's example can be
 * reproduced exactly. In use both are freshly random for every single message,
 * which is what the defaults do - a reused key pair or salt would repeat a
 * nonce, and a repeated AES-GCM nonce loses the key.
 */
export function encryptPushMessage(
  plaintext: Buffer,
  keys: PushKeys,
  options: Readonly<{ salt?: Buffer; serverPrivateKey?: Buffer }> = {},
): EncryptedPush {
  const clientPublicKey = fromBase64Url(keys.p256dh);
  const authSecret = fromBase64Url(keys.auth);
  if (clientPublicKey.length !== 65 || clientPublicKey[0] !== 0x04) throw new Error("invalid_p256dh");
  if (authSecret.length !== 16) throw new Error("invalid_auth_secret");

  const ecdh = createECDH("prime256v1");
  if (options.serverPrivateKey) ecdh.setPrivateKey(options.serverPrivateKey);
  else ecdh.generateKeys();
  const serverPublicKey = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(clientPublicKey);
  const salt = options.salt ?? randomBytes(16);

  // The two public keys go into the derivation in a fixed order - the browser's
  // first - so that both sides derive the same key from the same handshake.
  const keyInfo = Buffer.concat([utf8("WebPush: info"), Buffer.from([0]), clientPublicKey, serverPublicKey]);
  const ikm = expand(extract(authSecret, sharedSecret), keyInfo, 32);
  const prk = extract(salt, ikm);
  const cek = expand(prk, Buffer.concat([utf8("Content-Encoding: aes128gcm"), Buffer.from([0])]), 16);
  const nonce = expand(prk, Buffer.concat([utf8("Content-Encoding: nonce"), Buffer.from([0])]), 12);

  // 0x02 is the record delimiter that says "this is the last one". It is part of
  // the plaintext, not of the framing, so it is encrypted with everything else.
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const record = Buffer.concat([
    cipher.update(Buffer.concat([plaintext, Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  // RFC 8188 header: salt, record size, then the key id - which for Web Push is
  // the application server's public key, so the browser knows what to run the
  // ECDH against.
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header.writeUInt8(serverPublicKey.length, 20);

  return { body: Buffer.concat([header, serverPublicKey, record]), serverPublicKey };
}
