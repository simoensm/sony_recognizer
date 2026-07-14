## What & why

<!-- Link the issue / milestone. One sentence: what does this change do? -->

## Checklist

- [ ] Follows the design docs (`docs/design/`) or updates them if it deviates
- [ ] Business logic lives in `packages/core`, not in route handlers
- [ ] Authorization goes through `can()` (no ad-hoc permission checks)
- [ ] No secrets, no real event data, no real faces in code or fixtures
- [ ] Typecheck and build pass locally
