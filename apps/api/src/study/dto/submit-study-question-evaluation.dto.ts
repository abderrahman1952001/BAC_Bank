import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import {
  StudyQuestionDiagnosis,
  StudyQuestionReflection,
  StudyQuestionResultStatus,
} from '@prisma/client';

function normalizeEnumString({ value }: TransformFnParams) {
  return typeof value === 'string' ? value.trim().toUpperCase() : undefined;
}

export class SubmitStudyQuestionEvaluationDto {
  @Transform(normalizeEnumString)
  @IsEnum(StudyQuestionResultStatus)
  resultStatus!: StudyQuestionResultStatus;

  @IsOptional()
  @Transform(normalizeEnumString)
  @IsEnum(StudyQuestionReflection)
  reflection?: StudyQuestionReflection;

  @IsOptional()
  @Transform(normalizeEnumString)
  @IsEnum(StudyQuestionDiagnosis)
  diagnosis?: StudyQuestionDiagnosis;
}
