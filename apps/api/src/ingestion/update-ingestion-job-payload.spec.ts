import { plainToInstance } from 'class-transformer';
import { UpdateIngestionJobDto } from './dto/update-ingestion-job.dto';
import { hasDefinedUpdateIngestionJobField } from './update-ingestion-job-payload';

describe('hasDefinedUpdateIngestionJobField', () => {
  it('treats omitted transformed dto fields as absent', () => {
    const payload = plainToInstance(UpdateIngestionJobDto, {
      draft_json: {
        exam: {
          year: 2025,
        },
      },
      review_notes: null,
    });

    expect(Object.prototype.hasOwnProperty.call(payload, 'review_notes')).toBe(
      true,
    );
    expect(hasDefinedUpdateIngestionJobField(payload, 'draft_json')).toBe(true);
    expect(hasDefinedUpdateIngestionJobField(payload, 'review_notes')).toBe(
      true,
    );
  });
});
