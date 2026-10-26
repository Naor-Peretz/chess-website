---
paths:
  - apps/backend/**
---

# Backend rules

Layering is routes → controllers → services → repositories. Skipping a layer
(a controller touching Prisma, a route holding logic) is the thing to flag.

**Config.** Read `config` from `src/config/unifiedConfig.ts`. `process.env`
anywhere else in `apps/backend/src` is wrong; `src/instrument.ts` is the single
exception, since it runs before the config module is importable.

**Controllers** extend `BaseController` and return through `handleSuccess()`,
`handleError(error, res, operation)`, or `handleValidationError()`. Every
response is wrapped as `{ success, data }`, which is why clients read
`response.data.data.x`.

**Repositories** extend `BaseRepository` and wrap every database call:

```typescript
async findById(id: string): Promise<Entity | null> {
  return this.executeWithErrorHandling(
    'findById',
    () => this.prisma.entity.findUnique({ where: { id } }),
    { id }
  );
}
```

A bare `this.prisma.*` call in a repository loses the Sentry context.

**Validation** uses Zod schemas from `@chess-website/shared`, always through
`safeParse`, never `parse`. Zod 4 exposes `error.issues`, not `error.errors`.

```typescript
const result = schema.safeParse(req.body);
if (!result.success) {
  this.handleValidationError(res, this.formatZodError(result.error));
  return;
}
```

**Ownership.** Any handler reaching a game must go through
`gameService.getGame(gameId, userId)` or filter on `userId` in the query.
Fetching by id alone lets one user read another's game.

**Concurrency.** `Game` uses a `version` column for optimistic locking. Writes go
through `updateWithVersion`, `addMoveWithVersion`, or `finishGameWithVersion`,
and a chained sequence must thread the returned version into the next call. A
version mismatch raises `ConcurrentModificationError`, which maps to 409.

**Engine work** goes through `EnginePool` with acquire/release; never construct a
`StockfishEngine` directly in a service.
