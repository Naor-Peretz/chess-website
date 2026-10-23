# Configuration

All backend configuration goes through one typed object. Reading `process.env`
anywhere outside that file is a lint error and hides configuration from the type
checker.

**File:** `apps/backend/src/config/unifiedConfig.ts`

## Shape

```typescript
export interface UnifiedConfig {
  server: { port: number; nodeEnv: string };
  database: { url: string };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bffExchangeSecret: string;
    google: { clientId: string; clientSecret: string; callbackUrl: string };
  };
  stockfish: { depths: Record<number, number> };
  engine: { timeout: number; initTimeout: number; poolSize: number };
  cors: { origin: string };
  sentry: { dsn: string; environment: string; enabled: boolean };
}
```

## Using it

```typescript
import { config } from '../config/unifiedConfig';

const port = config.server.port;
const depth = config.stockfish.depths[difficultyLevel];
```

```typescript
// Wrong — untyped, undiscoverable, and invisible to the config surface
const port = parseInt(process.env.PORT || '3001', 10);
```

## Adding a setting

1. Add the field to the `UnifiedConfig` interface, in the group it belongs to.
2. Read it in the `config` object with a default that is safe for local
   development.
3. Add it to `.env.example` so the next person knows it exists.
4. If CI or the deploy needs it, add it to the workflow env block and to the
   Render or Vercel environment.

Defaults must never be a real secret. `jwtSecret` and `bffExchangeSecret` fall
back to obvious placeholder strings precisely so a missing value fails loudly in
production rather than silently accepting a known key.

## Engine tuning

`ENGINE_POOL_SIZE` (default 2, max 10) sets how many Stockfish instances the pool
holds. `ENGINE_TIMEOUT` bounds a single move analysis, `ENGINE_INIT_TIMEOUT` the
startup handshake. Raising the pool size raises memory use roughly linearly —
each instance is a full WASM engine.

## Verifying

```bash
grep -rn "process\.env" apps/backend/src --include="*.ts" | grep -v unifiedConfig
```

That should return nothing but `src/instrument.ts`, which runs before the config
module is importable.
