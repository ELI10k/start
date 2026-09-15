# App Privacy disclosure worksheet

Use this worksheet to complete App Store Connect's App Privacy questionnaire.
It is an engineering inventory, not a substitute for checking the final build
and Apple's current definitions at submission time.

| Data category | Examples in START | Linked to user | Primary purpose |
| --- | --- | --- | --- |
| Contact info | email, name, optional phone | Yes | Account management, authentication, coach communication |
| Health & fitness | step count, weight, measurements, training activity, nutrition goals | Yes | App functionality and personalized coaching |
| User content | messages, check-in answers, medical notes supplied by user | Yes | App functionality and coaching |
| Photos or videos | progress photos, meal photos, exercise-technique videos | Yes | App functionality and coaching |
| Identifiers | account ID, device/session ID, push token | Yes | Authentication, security, notifications |
| Usage data | allowlisted product events without sensitive payloads | Yes when signed in | Product analytics and reliability |
| Diagnostics | sanitized error kind and location | Potentially | Reliability and support |

## Required declarations and boundaries

- Data is not used for third-party advertising or cross-company tracking.
- Health and fitness data is not sold, used for marketing, or used for data
  mining unrelated to health management.
- A meal description or image is sent to OpenAI only when the user deliberately
  requests an AI nutrition estimate.
- Supabase processes authentication, database and private storage data.
- Vercel hosts and executes the server-rendered application.
- Apple and device push services process notification delivery identifiers.
- YouTube may process playback/network information when embedded course videos
  are opened; verify the final player behavior and disclose it if Apple's current
  questionnaire requires it.

Before submitting, compare this inventory with the production environment,
enabled SDKs, server logs, analytics configuration and every new feature added
after this document's date.

