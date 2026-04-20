import { Transform, TransformFnParams } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

function normalizeAnswerValue({ value }: TransformFnParams) {
  return typeof value === 'string' ? value.trim() : '';
}

export class SubmitStudyQuestionAnswerDto {
  @Transform(normalizeAnswerValue)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value!: string;
}
