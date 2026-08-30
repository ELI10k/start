// One VAPID key pair, printed once.
//
// This is the whole "credential" web push needs. No Apple Developer account, no
// Firebase project: the pair is generated here, the public half goes into the
// browser bundle so a subscription can be bound to it, and the private half
// signs every send. Losing the private half invalidates every existing
// subscription, so it is generated once and kept.
//
//   npm run push:vapid
//
// Then set, on Vercel and in .env.local:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY   the public value below
//   VAPID_PRIVATE_KEY              the private value below - a secret
//   VAPID_SUBJECT                  mailto: address the push service can reach
import { createECDH } from "node:crypto";

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const encode = (value) => value.toString("base64url");

console.log("");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + encode(ecdh.getPublicKey()));
console.log("VAPID_PRIVATE_KEY=" + encode(ecdh.getPrivateKey()));
console.log("VAPID_SUBJECT=mailto:elicohenib@gmail.com");
console.log("");
console.log("The private key is a secret. Do not commit it; set it in the Vercel project.");
