import { Transform, TransformFnParams } from 'class-transformer';
import { IsIn, IsObject, IsOptional } from 'class-validator';
import type { CompleteLabMissionAttemptRequest } from '@bac-bank/contracts/lab';

function normalizeStatus(params: TransformFnParams): unknown {
  const value = params.value as unknown;
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CompleteLabMissionAttemptDto implements CompleteLabMissionAttemptRequest {
  @Transform(normalizeStatus)
  @IsIn(['COMPLETED', 'FAILED'])
  status!: CompleteLabMissionAttemptRequest['status'];

  @IsOptional()
  @IsObject()
  resultJson?: Record<string, unknown> | null;
}
