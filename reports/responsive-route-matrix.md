# Responsive route matrix

Source-level review at 320, 375, 430, 768, 1024, and 1440 CSS pixels. `PASS` means responsive source rules exist and no page-level horizontal overflow is expected; final device-browser visual regression remains future QA.

| Route family | 320 | 375 | 430 | 768 | 1024 | 1440 | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | PASS | PASS | PASS | PASS | PASS | PASS | 2-column metrics scale to 4. |
| `/nutrition` | PASS | PASS | PASS | PASS | PASS | PASS | Sidebar stacks below desktop. |
| `/progress` | PASS | PASS | PASS | PASS | PASS | PASS | Wide history table scrolls locally. |
| `/check-in` | PASS | PASS | PASS | PASS | PASS | PASS | Five rating buttons retain touch targets. |
| `/profile`, `/preferences`, `/support` | PASS | PASS | PASS | PASS | PASS | PASS | Forms stack before desktop. |
| `/content/**` | PASS | PASS | PASS | PASS | PASS | PASS | Cards move 1→2→3 columns where applicable. |
| `/foods`, `/foods/[id]` | PASS | PASS | PASS | PASS | PASS | PASS | Food cards collapse to one column under 640px. |
| `/coach` | PASS | PASS | PASS | PASS | PASS | PASS | Dashboard grid expands progressively. |
| `/coach/clients/**` | PASS | PASS | PASS | PASS | PASS | PASS | Filters scroll locally; detail panels stack. |
| `/coach/menus/**` | PASS | PASS | PASS | PASS | PASS | PASS | Builder sidebar moves below content until desktop. |
| `/coach/foods`, `/import` | PASS | PASS | PASS | PASS | PASS | PASS | Reuse food/import responsive containers. |

No workout route was reviewed because it intentionally does not exist.
