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

function trimString({ value }: TransformFnParams): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function normalizeOptionalUuid({
  value,
}: TransformFnParams): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeEnumString({ value }: TransformFnParams) {
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
