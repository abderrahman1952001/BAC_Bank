import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FlashcardSourceType, FlashcardType } from '@prisma/client';

function trimString(params: TransformFnParams): string | undefined {
  const value = params.value as unknown;
  return typeof value === 'string' ? value.trim() : undefined;
}

function normalizeOptionalUuid(
  params: TransformFnParams,
): string | null | undefined {
  const value = params.value as unknown;

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeEnumString(params: TransformFnParams): unknown {
  const value = params.value as unknown;
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CreateFlashcardDto {
  @IsOptional()
  @Transform(normalizeOptionalUuid)
  @IsUUID()
  deckId?: string | null;

  @IsOptional()
  @Transform(normalizeEnumString)
  @IsEnum(FlashcardType)
  type?: FlashcardType;

  @IsOptional()
  @Transform(normalizeEnumString)
  @IsEnum(FlashcardSourceType)
  sourceType?: FlashcardSourceType;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  front!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  back!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown> | null;

  @IsOptional()
  @Transform(normalizeOptionalUuid)
  @IsUUID()
  subjectId?: string | null;

  @IsOptional()
  @Transform(normalizeOptionalUuid)
  @IsUUID()
  curriculumNodeId?: string | null;

  @IsOptional()
  @Transform(normalizeOptionalUuid)
  @IsUUID()
  learningTargetId?: string | null;

  @IsOptional()
  @Transform(normalizeOptionalUuid)
  @IsUUID()
  courseLessonId?: string | null;

  @IsOptional()
  @Transform(normalizeOptionalUuid)
  @IsUUID()
  courseStepId?: string | null;

  @IsOptional()
  @Transform(normalizeOptionalUuid)
  @IsUUID()
  examNodeId?: string | null;
}
