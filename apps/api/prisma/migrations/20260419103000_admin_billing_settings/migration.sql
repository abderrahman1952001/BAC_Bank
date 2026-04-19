CREATE TABLE "billing_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "singleton_key" TEXT NOT NULL DEFAULT 'default',
    "premium_30_days_amount_dzd" INTEGER NOT NULL,
    "premium_30_days_duration_days" INTEGER NOT NULL,
    "premium_90_days_amount_dzd" INTEGER NOT NULL,
    "premium_90_days_duration_days" INTEGER NOT NULL,
    "premium_bac_season_amount_dzd" INTEGER NOT NULL,
    "bac_season_ends_at" TIMESTAMP(3),
    "updated_by_user_id" UUID,
    "updated_by_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_settings_singleton_key_key" ON "billing_settings"("singleton_key");
