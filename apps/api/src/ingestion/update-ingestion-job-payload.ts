import { UpdateIngestionJobDto } from './dto/update-ingestion-job.dto';

export function hasDefinedUpdateIngestionJobField<
  Key extends keyof UpdateIngestionJobDto,
>(payload: UpdateIngestionJobDto, key: Key) {
  return payload[key] !== undefined;
}
