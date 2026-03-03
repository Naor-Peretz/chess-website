-- DropIndex
DROP INDEX "games_status_idx";

-- DropIndex
DROP INDEX "games_updated_at_idx";

-- DropIndex
DROP INDEX "games_user_id_idx";

-- DropIndex
DROP INDEX "games_user_id_status_idx";

-- CreateIndex
CREATE INDEX "games_user_id_updated_at_idx" ON "games"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "games_user_id_status_updated_at_idx" ON "games"("user_id", "status", "updated_at");
