import { Transform, TransformFnParams } from 'class-transformer';
import { StudyReviewOutcome } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

function normalizeUuid(params: TransformFnParams): string | undefined {
  const value = params.value as unknown;

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeReviewOutcome(params: TransformFnParams): unknown {
  const value = params.value as unknown;
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class RecordStudyReviewQueueOutcomeDto {
  @Transform(normalizeUuid)
  @IsUUID()
  exerciseNodeId!: string;

  @IsOptional()
  @Transform(normalizeUuid)
  @IsUUID()
  questionNodeId?: string;

  @Transform(normalizeReviewOutcome)
  @IsEnum(StudyReviewOutcome)
  outcome!: StudyReviewOutcome;
}
