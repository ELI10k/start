# Domain model

- Client: stable ID, name, phone, status, current/target measurements.
- Food: stable source ID, Hebrew name, brand, category, per-100g nutrition, serving/package metadata.
- Meal plan: draft or active, targets, ordered meals, food items measured in grams, optional client assignment.
- Weigh-in: client/date/weight plus optional body measurements and note.
- Weekly check-in: client/date, weight, waist, 1–5 ratings, training-completed flag, optional note.
- Demo snapshot: identity, profile, assignment, completions, measurements, check-ins, preferences, content progress, coach notes.

Missing optional food macros remain missing for display and are safely treated as zero only during arithmetic. Plans do not copy food nutrition values; they reference food IDs, preventing stale duplicated calculations.
