import { Transform, TransformFnParams, Type } from 'class-transformer';
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

export enum PracticeStudyMode {
  SOLVE = 'SOLVE',
  REVIEW = 'REVIEW',
}

class PracticeSessionQuestionStateDto {
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
}

export class UpdatePracticeSessionProgressDto {
  @IsOptional()
  @Transform(normalizeUuid)
  @IsUUID()
  activeExerciseId?: string;

  @IsOptional()
  @Transform(normalizeUuid)
  @IsUUID()
  activeQuestionId?: string;

  @IsOptional()
  @IsEnum(PracticeStudyMode)
  mode?: PracticeStudyMode;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(600)
  @ValidateNested({ each: true })
  @Type(() => PracticeSessionQuestionStateDto)
  questionStates?: PracticeSessionQuestionStateDto[];

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
