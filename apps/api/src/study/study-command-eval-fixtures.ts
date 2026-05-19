import type { StudyCommandStarterMode } from '@bac-bank/contracts/study-command';

export type StudyCommandEvalFixture = {
  id: string;
  command: string;
  expectedMode: StudyCommandStarterMode;
  expectedSubjectCode?: string;
  expectedTopicCodes?: string[];
  expectsClarification?: boolean;
};

export const studyCommandEvalFixtures: StudyCommandEvalFixture[] = [
  {
    id: 'school-test-physics-electricity',
    command: 'عندي فرض في الفيزياء غدوة على الكهرباء',
    expectedMode: 'SCHOOL_TEST_PREP',
    expectedSubjectCode: 'PHYSICS',
    expectedTopicCodes: ['ELECTRICITY'],
  },
  {
    id: 'tutor-replay-functions',
    command: 'خرجت من cours ta3 math ودرت الدوال، نحتاج تمارين مشابهة',
    expectedMode: 'TUTOR_REPLAY',
    expectedSubjectCode: 'MATHEMATICS',
    expectedTopicCodes: ['FUNCTIONS'],
  },
  {
    id: 'bac-training-svt-photosynthesis',
    command: 'أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي آخر 3 سنوات',
    expectedMode: 'BAC_TRAINING',
    expectedSubjectCode: 'NATURAL_SCIENCES',
    expectedTopicCodes: ['PHOTOSYNTHESIS'],
  },
  {
    id: 'lesson-understanding-protein-synthesis',
    command: 'مافهمتش تركيب البروتين، اشرحلي الدرس',
    expectedMode: 'LESSON_UNDERSTANDING',
    expectedSubjectCode: 'NATURAL_SCIENCES',
    expectedTopicCodes: ['PROTEIN_SYNTHESIS'],
  },
  {
    id: 'memorization-history-dates',
    command: 'راجعلي التواريخ والشخصيات بسرعة',
    expectedMode: 'MEMORIZATION_REVIEW',
    expectedTopicCodes: ['HISTORICAL_DATES'],
  },
  {
    id: 'simulation-full-paper',
    command: 'نحب محاكاة موضوع كامل في الرياضيات',
    expectedMode: 'SIMULATION',
    expectedSubjectCode: 'MATHEMATICS',
  },
  {
    id: 'mistake-repair',
    command: 'أريد إصلاح أخطائي في الفيزياء',
    expectedMode: 'MISTAKE_REPAIR',
    expectedSubjectCode: 'PHYSICS',
  },
  {
    id: 'lab-visual-functions',
    command: 'نحب مختبر يرسملي الدوال باش نفهمها',
    expectedMode: 'LAB_EXPLORATION',
    expectedSubjectCode: 'MATHEMATICS',
    expectedTopicCodes: ['FUNCTIONS'],
  },
  {
    id: 'library-archive',
    command: 'افتحلي أرشيف مواضيع باك علوم الطبيعة',
    expectedMode: 'LIBRARY_SEARCH',
    expectedSubjectCode: 'NATURAL_SCIENCES',
  },
  {
    id: 'missing-subject-clarification',
    command: 'أريد تدريب BAC آخر 3 سنوات',
    expectedMode: 'BAC_TRAINING',
    expectsClarification: true,
  },
];
