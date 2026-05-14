import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { FlashcardReviewRating } from '@prisma/client';

function normalizeReviewRating(params: TransformFnParams): unknown {
  const value = params.value as unknown;
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class ReviewFlashcardDto {
  @Transform(normalizeReviewRating)
  @IsEnum(FlashcardReviewRating)
  rating!: FlashcardReviewRating;
}
