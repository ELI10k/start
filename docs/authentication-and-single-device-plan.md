# Authentication and single-device plan

Status: technical design only. No authentication, authorization, verification delivery, backend session store, or audit log is implemented.

## Roles and trust boundaries

`coach` may list and manage assigned clients, menus, measurements, check-ins, notes, and device resets. `client` may read and update only their own permitted records. Every API must derive identity and role from a server-validated session; route paths and submitted IDs are never authority. A coach-client assignment table scopes coach access.

## Passwordless sign-in

1. User submits a normalized email or E.164 phone number to `POST /auth/challenges`.
2. Server always returns the same generic response, rate-limits by account, address, IP, and device fingerprint, then sends a short-lived, single-use code or signed link through an approved provider.
3. `POST /auth/challenges/:id/verify` consumes the challenge, records the device, and issues an HttpOnly, Secure, SameSite=Lax refresh cookie plus a short-lived access session.
4. Unknown accounts are not auto-created. Coach provisioning is an audited administrative operation.

## One active client device

After challenge verification, a transaction locks the client account and checks its active device session. For a known active device, rotate the refresh-token family. For a new device, require a second verification step and show that the previous device will be revoked. Confirmation atomically revokes the previous refresh family/device session, activates the new device, and writes audit events. Coaches may request a reset, but cannot see codes or tokens; reset revokes all sessions and requires the client to verify again.

Coach accounts should support multiple explicitly named devices with stronger MFA; the one-device restriction applies to clients unless policy later changes.

## Expiration and rotation

- Access session: 10–15 minutes, idle authorization rechecked server-side.
- Refresh session: 30-day absolute maximum and 7-day idle maximum.
- Rotate the refresh token on every use. Store only an Argon2id/HMAC hash, family ID, previous-token grace marker, and expiry.
- Reuse of an already-rotated token revokes the entire family and emits a high-severity audit event.
- Passwordless challenges expire in 10 minutes, are single-use, and have attempt limits.

## Suggested tables

- `users(id, role, status, created_at, updated_at)`
- `user_emails(user_id, normalized_email, verified_at, is_primary)`
- `user_phones(user_id, e164_phone, verified_at, is_primary)`
- `coach_client_assignments(coach_id, client_id, active_from, active_to)`
- `devices(id, user_id, public_id, display_name, platform, first_seen_at, last_seen_at, verified_at, revoked_at)`
- `sessions(id, user_id, device_id, refresh_family_id, refresh_hash, previous_hash, expires_at, idle_expires_at, rotated_at, revoked_at)`
- `login_challenges(id, user_id, channel, destination_hash, code_hash, expires_at, attempts, consumed_at)`
- `audit_events(id, actor_user_id, subject_user_id, session_id, action, outcome, ip_prefix, user_agent_hash, metadata_json, created_at)`

Nutrition, check-ins, measurements, menus, assignments, completion, preferences, content progress, and coach notes require separate domain tables with ownership, timestamps, and optimistic version fields.

## Required endpoints

- `POST /auth/challenges`, `POST /auth/challenges/:id/verify`
- `POST /auth/devices/verify`, `POST /auth/devices/replace`
- `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`
- `GET /me`, `GET /me/devices`, `DELETE /me/devices/:id`
- `POST /coach/clients/:id/device-reset` (step-up coach verification required)
- Verified change flows: `POST /me/email/change`, `/verify-old`, `/verify-new`; equivalent phone endpoints

Domain APIs should be versioned and server-validate all numeric/date/state transitions. Mutations use idempotency keys where repetition is harmful.

## Middleware and authorization

Public: only sign-in challenge UI and static assets. Client routes require an active `client` session; coach routes require `coach`. Middleware may reject obvious missing sessions, but authoritative role, ownership, device status, expiry, and coach-client assignment checks must run in each server handler/service. Never trust client-side guards. CSRF protections apply to cookie-authenticated mutations; security headers and origin checks are required.

## Lost phone and contact changes

Lost phone: use an already verified alternate channel or support-led identity recovery with documented evidence review; then revoke all sessions and verify a new device. Never let a coach directly set a phone and bypass verification.

Email/phone change: require a recent session plus verification of the old channel when available and the new channel. Notify the old channel, delay high-risk changes when recovery signals are weak, revoke other sessions, and audit each step. A lost-old-channel path uses the stronger recovery process.

## Security limitations and backend prerequisites

The current UI has mock identities and readable browser storage. It provides no confidentiality, cross-device synchronization, tamper resistance, server validation, account recovery, revocation, or reliable audit trail. Before launch: threat model, privacy/data-retention policy, secrets management, encrypted transport and backups, provider credentials, abuse controls, monitoring, incident response, dependency scanning, penetration testing, and legal review are required.

## Migration from demo storage

1. Freeze and version the adapter contract; add API-backed adapter behind a feature flag.
2. Implement server schemas and authorization tests; seed only explicit demo tenants in non-production.
3. Add authentication and server-side ownership checks before enabling writes.
4. Offer an explicit one-time import of local preferences/completions, validate every field, and never silently merge local coach notes or health-related data.
5. Verify parity, disable browser domain persistence, retain only harmless display preferences if approved, and document/export/delete demo data.

