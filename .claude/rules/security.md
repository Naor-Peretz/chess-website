---
paths:
  - '**/auth*'
  - '**/*csrf*'
  - '**/api/proxy/**'
  - '**/middleware/**'
  - apps/backend/src/config/**
---

# Security rules

**JWT.** Verify with an explicit algorithm list — `jwt.verify(token, secret, { algorithms: ['HS256'] })`.
Bare `verify` accepts whatever the token header claims. Revocation works through
the `tokenVersion` column: incrementing it invalidates every outstanding token
for that user.

**The BFF exchange** (`POST /api/auth/exchange`) is protected by
`BFF_EXCHANGE_SECRET` and compared in constant time. It validates googleId,
email, and displayName through Zod before trusting them. It is the only path
that mints a session — do not add another.

**CSRF** is a double-submit cookie: `csrf_token` is readable by JS, and mutating
requests echo it in `X-CSRF-Token`. The proxy compares the two in constant time
and returns 403 on mismatch. Validation is skipped in development and test; keep
that condition narrow.

**The proxy route** allows only the `games`, `users`, and `auth` path prefixes,
validates query parameters against a per-path allowlist, and rejects `..`, its
encoded variants, and control characters. Widening any of those lists is a
security decision, not a convenience one.

**OAuth redirects** use hardcoded destinations. Never build a redirect target
from user input.

**Ownership** is checked on every game operation. `findUnique({ where: { id } })`
on a Game is a horizontal privilege escalation.

**Errors** go to Sentry with context; responses carry a generic message. Never
return `error.message` or a stack to the client.

**Secrets** are read through `unifiedConfig` and never logged. Defaults in that
file are deliberately obvious placeholders so a missing value fails loudly rather
than silently using a known key.
