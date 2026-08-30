import assert from "node:assert/strict";
import test from "node:test";
import { createECDH } from "node:crypto";
import { encryptPushMessage, fromBase64Url, toBase64Url } from "../lib/push/aes128gcm.ts";
import { vapidAuthorization } from "../lib/push/vapid.ts";

/**
 * RFC 8291 section 5 publishes a worked example: a plaintext, both key pairs,
 * the auth secret, the salt, and the exact bytes they have to produce. Running
 * it is the difference between an implementation that is self-consistent and one
 * that a browser will actually decrypt - the two are indistinguishable from
 * inside, and the first one fails silently in front of a real person.
 */
const RFC_8291 = {
  plaintext: "V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24",
  userAgentPublicKey: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  authSecret: "BTBZMqHH6r4Tts7J_aSIgg",
  applicationServerPrivateKey: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  applicationServerPublicKey: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  body: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
} as const;

test("the encryption reproduces RFC 8291's own worked example, byte for byte", () => {
  const { body, serverPublicKey } = encryptPushMessage(
    fromBase64Url(RFC_8291.plaintext),
    { p256dh: RFC_8291.userAgentPublicKey, auth: RFC_8291.authSecret },
    {
      salt: fromBase64Url(RFC_8291.salt),
      serverPrivateKey: fromBase64Url(RFC_8291.applicationServerPrivateKey),
    },
  );
  assert.equal(toBase64Url(serverPublicKey), RFC_8291.applicationServerPublicKey);
  assert.equal(toBase64Url(body), RFC_8291.body);
});

test("the header carries the salt, the record size and the server's key", () => {
  const { body } = encryptPushMessage(Buffer.from("שלום"), {
    p256dh: RFC_8291.userAgentPublicKey,
    auth: RFC_8291.authSecret,
  });
  assert.equal(body.readUInt32BE(16), 4096);
  // 65 bytes of uncompressed P-256 public key, announced by the byte before it.
  assert.equal(body.readUInt8(20), 65);
  assert.equal(body[21], 0x04);
  // Salt, record size, key length, key, then a record that is never empty.
  assert.ok(body.length > 16 + 4 + 1 + 65);
});

test("a fresh salt and key pair are used for every message", () => {
  const subscription = { p256dh: RFC_8291.userAgentPublicKey, auth: RFC_8291.authSecret };
  const first = encryptPushMessage(Buffer.from("same"), subscription).body;
  const second = encryptPushMessage(Buffer.from("same"), subscription).body;
  // Reusing either would repeat an AES-GCM nonce, and a repeated nonce is how
  // the key is recovered from two messages.
  assert.notEqual(first.subarray(0, 16).toString("hex"), second.subarray(0, 16).toString("hex"));
  assert.notEqual(first.subarray(21, 86).toString("hex"), second.subarray(21, 86).toString("hex"));
});

test("a subscription that is not a P-256 key is refused rather than sent", () => {
  const auth = RFC_8291.authSecret;
  assert.throws(() => encryptPushMessage(Buffer.from("x"), { p256dh: "AAAA", auth }), /invalid_p256dh/);
  assert.throws(
    () => encryptPushMessage(Buffer.from("x"), { p256dh: RFC_8291.userAgentPublicKey, auth: "AAAA" }),
    /invalid_auth_secret/,
  );
});

// ------------------------------------------------------------------- VAPID

const serverKeys = (() => {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { publicKey: toBase64Url(ecdh.getPublicKey()), privateKey: toBase64Url(ecdh.getPrivateKey()) };
})();

test("the VAPID header is scoped to the push service it is sent to", () => {
  const header = vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", serverKeys, "mailto:coach@example.com");
  assert.match(header, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
  const [, token] = /t=([\w-]+\.[\w-]+\.[\w-]+)/.exec(header)!;
  const [rawHeader, rawClaims] = token.split(".");
  assert.deepEqual(JSON.parse(fromBase64Url(rawHeader).toString()), { typ: "JWT", alg: "ES256" });
  const claims = JSON.parse(fromBase64Url(rawClaims).toString());
  // The audience is the push service's origin and nothing more: a token minted
  // for one service must not be replayable against another.
  assert.equal(claims.aud, "https://fcm.googleapis.com");
  assert.equal(claims.sub, "mailto:coach@example.com");
  assert.ok(claims.exp > Math.floor(Date.now() / 1000));
  // RFC 8292 caps the lifetime at 24 hours.
  assert.ok(claims.exp <= Math.floor(Date.now() / 1000) + 86_400);
});

test("the signature is the raw pair a JWT carries, not a DER blob", () => {
  const header = vapidAuthorization("https://web.push.apple.com/x", serverKeys, "mailto:coach@example.com");
  const signature = fromBase64Url(/t=[\w-]+\.[\w-]+\.([\w-]+)/.exec(header)![1]);
  // ES256 is r and s, 32 bytes each. A DER-encoded signature is what
  // node:crypto returns by default and what every push service rejects.
  assert.equal(signature.length, 64);
});
