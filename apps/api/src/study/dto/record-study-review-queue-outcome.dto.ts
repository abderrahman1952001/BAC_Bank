import { Transform, TransformFnParams } from 'class-transformer';
import { StudyReviewOutcome } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

function normalizeUuid({ value }: TransformFnParams): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export class RecordStudyReviewQueueOutcomeDto {
  @Transform(normalizeUuid)
  @IsUUID()
  exerciseNodeId!: string;

  @IsOptional()
  @Transform(normalizeUuid)
  @IsUUID()
  questionNodeId?: string;

  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(StudyReviewOutcome)
  outcome!: StudyReviewOutcome;
}
