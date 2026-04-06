CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

ALTER TABLE "users"
ADD COLUMN "clerk_user_id" TEXT,
ADD COLUMN "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'FREE';

ALTER TABLE "users"
ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");
