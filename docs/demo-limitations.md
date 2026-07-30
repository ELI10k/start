# Demo limitations

- No authentication, authorization, backend, server validation, deployment, payment, notification, email, SMS, or support-message delivery.
- The selected client and coach are mock personas; all displayed client records are demo data.
- Presentation-only profile preferences remain in session memory. Production nutrition plans, assignments, meals, and eaten-item state are loaded from and saved to Supabase; localStorage is not a nutrition data source.
- Content entries are unpublished structural placeholders, not approved articles or videos.
- Food data is limited to the repository dataset; missing source values are not inferred.
- Refresh retains supported client local preferences/completions on the same browser, but coach edits reset. Clearing site data resets client state.
