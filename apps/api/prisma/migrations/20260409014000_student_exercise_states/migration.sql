-- CreateTable
CREATE TABLE "student_exercise_states" (
    "user_id" UUID NOT NULL,
    "exercise_node_id" UUID NOT NULL,
    "bookmarked_at" TIMESTAMP(3),
    "flagged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_exercise_states_pkey" PRIMARY KEY ("user_id","exercise_node_id")
);

-- CreateIndex
CREATE INDEX "student_exercise_states_exercise_node_id_idx" ON "student_exercise_states"("exercise_node_id");

-- CreateIndex
CREATE INDEX "student_exercise_states_user_id_updated_at_idx" ON "student_exercise_states"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "student_exercise_states_user_id_flagged_at_idx" ON "student_exercise_states"("user_id", "flagged_at");

-- CreateIndex
CREATE INDEX "student_exercise_states_user_id_bookmarked_at_idx" ON "student_exercise_states"("user_id", "bookmarked_at");

-- AddForeignKey
ALTER TABLE "student_exercise_states" ADD CONSTRAINT "student_exercise_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exercise_states" ADD CONSTRAINT "student_exercise_states_exercise_node_id_fkey" FOREIGN KEY ("exercise_node_id") REFERENCES "exam_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
