import { SessionType, SourceDocumentKind } from '@prisma/client';
import {
  buildCanonicalDocumentFileName,
  buildCanonicalDocumentStorageKey,
  type CanonicalStorageContext,
} from './storage-naming';

describe('storage naming', () => {
  it('stores canonical source documents under a subject folder within the year', () => {
    const context: CanonicalStorageContext = {
      year: 2024,
      streamCode: 'SE',
      subjectCode: 'MATH',
      sessionType: SessionType.NORMAL,
      qualifierKey: null,
    };

    const fileName = buildCanonicalDocumentFileName(
      context,
      SourceDocumentKind.EXAM,
    );

    expect(buildCanonicalDocumentStorageKey(context, fileName)).toBe(
      'bac/2024/documents/math/bac-exam-math-se-2024-normal.pdf',
    );
  });
});
