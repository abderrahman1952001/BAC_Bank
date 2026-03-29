CREATE TABLE "worker_heartbeats" (
    "worker_id" TEXT NOT NULL,
    "worker_type" TEXT NOT NULL,
    "last_heartbeat_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopped_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_heartbeats_pkey" PRIMARY KEY ("worker_id")
);

CREATE INDEX "worker_heartbeats_worker_type_last_heartbeat_at_idx"
ON "worker_heartbeats"("worker_type", "last_heartbeat_at");

CREATE INDEX "worker_heartbeats_worker_type_stopped_at_idx"
ON "worker_heartbeats"("worker_type", "stopped_at");
