import { Transform, TransformFnParams, Type } from 'class-transformer';
import { StudyReviewQueueStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetStudyReviewQueueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : undefined,
  )
  @IsString()
  subjectCode?: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : undefined,
  )
  @IsEnum(StudyReviewQueueStatus)
  status?: StudyReviewQueueStatus;
}
