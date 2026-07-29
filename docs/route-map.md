# Route map

Client: `/`, `/nutrition`, `/progress`, `/check-in`, `/profile`, `/preferences`, `/support`, `/content`, `/content/category/[category]`, `/content/[id]`, `/foods`, `/foods/[id]`.

Coach: `/coach`, `/coach/clients`, `/coach/clients/new`, `/coach/clients/[id]`, `/coach/clients/[id]/progress`, `/coach/clients/[id]/check-ins`, `/coach/menus`, `/coach/menus/new`, `/coach/menus/[id]`, `/coach/menus/[id]/preview`, `/coach/foods`.

Internal data utility: `/import`. Dynamic client/menu/food/content routes return a not-found state for unknown IDs. Workout routes/navigation intentionally do not exist.
