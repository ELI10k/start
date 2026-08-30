import { createPrivateKey, sign } from "node:crypto";
import { fromBase64Url, toBase64Url } from "./aes128gcm.ts";

/**
 * Voluntary Application Server Identification, RFC 8292.
 *
 * A push service will relay a message to a browser without knowing who sent it,
 * which is how an endpoint that leaks becomes a channel anybody can shout down.
 * VAPID closes that: every request carries a short-lived JWT signed by a key
 * pair that belongs to this deployment, and the browser's subscription is bound
 * to the public half of it.
 *
 * The pair is generated once with `npm run push:vapid` and lives in the
 * environment. No account with Apple or Google is involved - the keys are ours,
 * and the push service only checks that the same key signed the request that the
 * subscription was created against.
 */

export type VapidKeys = Readonly<{ publicKey: string; privateKey: string }>;

/** Twelve hours. The RFC allows twenty-four; half of it survives a slow clock. */
const LIFETIME_SECONDS = 12 * 60 * 60;

/** The raw P-256 scalar the generator prints, as a key node:crypto will sign with. */
function signingKey(keys: VapidKeys) {
  const publicKey = fromBase64Url(keys.publicKey);
  if (publicKey.length !== 65 || publicKey[0] !== 0x04) throw new Error("invalid_vapid_public_key");
  const privateKey = fromBase64Url(keys.privateKey);
  if (privateKey.length !== 32) throw new Error("invalid_vapid_private_key");
  return createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      d: keys.privateKey,
      x: toBase64Url(publicKey.subarray(1, 33)),
      y: toBase64Url(publicKey.subarray(33, 65)),
    },
  });
}

const segment = (value: unknown) => toBase64Url(Buffer.from(JSON.stringify(value)));

/**
 * The `Authorization` header for one request to one push service.
 *
 * `subject` is a mailto: or https: URL the push service can use to reach whoever
 * is sending - it is required, and a service is entitled to refuse without it.
 */
export function vapidAuthorization(
  endpoint: string,
  keys: VapidKeys,
  subject: string,
  now: Date = new Date(),
): string {
  const audience = new URL(endpoint).origin;
  const claims = {
    aud: audience,
    exp: Math.floor(now.getTime() / 1000) + LIFETIME_SECONDS,
    sub: subject,
  };
  const signingInput = `${segment({ typ: "JWT", alg: "ES256" })}.${segment(claims)}`;
  // ieee-p1363 is r||s. node:crypto signs to DER by default, which is a valid
  // ECDSA signature and not the one a JWT carries - every push service answers
  // 401 to it, and the error says nothing about why.
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: signingKey(keys),
    dsaEncoding: "ieee-p1363",
  });
  return `vapid t=${signingInput}.${toBase64Url(signature)}, k=${keys.publicKey}`;
}

/** The configured pair, or null where this deployment has not been given one. */
export function vapidKeysFromEnv(): VapidKeys | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  return publicKey && privateKey ? { publicKey, privateKey } : null;
}

/**
 * Who the push service should contact about these messages. A real address is
 * better than the default, but the default is a valid URL rather than a missing
 * header, which is what a service refuses on.
 */
export function vapidSubject(): string {
  const configured = process.env.VAPID_SUBJECT?.trim();
  if (configured && /^(mailto:|https:\/\/)/.test(configured)) return configured;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return site?.startsWith("https://") ? site : "mailto:support@start.app";
}
