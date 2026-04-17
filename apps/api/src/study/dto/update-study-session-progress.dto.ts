import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  StudyQuestionDiagnosis,
  StudyQuestionReflection,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

function normalizeUuid({ value }: TransformFnParams): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export enum StudySessionMode {
  SOLVE = 'SOLVE',
  REVIEW = 'REVIEW',
}

class StudySessionQuestionStateDto {
  @Transform(normalizeUuid)
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @IsBoolean()
  opened?: boolean;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsBoolean()
  skipped?: boolean;

  @IsOptional()
  @IsBoolean()
  solutionViewed?: boolean;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : undefined,
  )
  @IsEnum(StudyQuestionReflection)
  reflection?: StudyQuestionReflection;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : undefined,
  )
  @IsEnum(StudyQuestionDiagnosis)
  diagnosis?: StudyQuestionDiagnosis;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(86400)
  timeSpentSeconds?: number;
}

export class UpdateStudySessionProgressDto {
  @IsOptional()
  @Transform(normalizeUuid)
  @IsUUID()
  activeExerciseId?: string;

  @IsOptional()
  @Transform(normalizeUuid)
  @IsUUID()
  activeQuestionId?: string;

  @IsOptional()
  @IsEnum(StudySessionMode)
  mode?: StudySessionMode;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(600)
  @ValidateNested({ each: true })
  @Type(() => StudySessionQuestionStateDto)
  questionStates?: StudySessionQuestionStateDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  totalQuestionCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  completedQuestionCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  skippedQuestionCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  solutionViewedCount?: number;
}
