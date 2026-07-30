# Backend handoff

Implement the authentication plan first, then persistent domain tables and service-layer authorization. Preserve `ClientDataAdapter` semantics while introducing an API adapter. Server-validate food IDs, quantities, ratings, dates, ownership, assignment replacement, and state transitions. Use optimistic versions for plan editing and idempotency keys for check-ins/assignments. Import local demo state only with explicit consent. Add audit events for authentication, device, assignment, coach-note, and sensitive profile changes.

Do not reuse mock client phone numbers or demo check-ins outside local/test environments.
