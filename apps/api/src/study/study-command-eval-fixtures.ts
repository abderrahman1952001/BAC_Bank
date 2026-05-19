import type { StudyCommandStarterMode } from '@bac-bank/contracts/study-command';

export type StudyCommandEvalFixture = {
  id: string;
  command: string;
  expectedMode: StudyCommandStarterMode;
  expectedSubjectCode?: string;
  expectedTopicCodes?: string[];
  expectsClarification?: boolean;
  expectedActionKind?: 'CREATE_STUDY_SESSION' | 'OPEN_ROUTE';
  expectedPrimaryHref?: string;
  context?: 'default' | 'empty';
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
    id: 'school-test-darja-latin-math-functions',
    command: '3andi fard ghodwa f maths les fonctions',
    expectedMode: 'SCHOOL_TEST_PREP',
    expectedSubjectCode: 'MATHEMATICS',
    expectedTopicCodes: ['FUNCTIONS'],
  },
  {
    id: 'school-test-french-chemistry-organic',
    command: 'devoir demain chimie organique, exercices courts',
    expectedMode: 'SCHOOL_TEST_PREP',
    expectedSubjectCode: 'PHYSICS',
    expectedTopicCodes: ['ORGANIC_CHEMISTRY'],
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
    id: 'bac-training-svt-immunity',
    command: 'بغيت مواضيع باك في المناعة',
    expectedMode: 'BAC_TRAINING',
    expectedSubjectCode: 'NATURAL_SCIENCES',
    expectedTopicCodes: ['IMMUNITY'],
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
    id: 'memorization-due-cards-context',
    command: 'راجعلي البطاقات المستحقة',
    expectedMode: 'MEMORIZATION_REVIEW',
    expectedSubjectCode: 'NATURAL_SCIENCES',
  },
  {
    id: 'simulation-full-paper',
    command: 'نحب محاكاة موضوع كامل في الرياضيات',
    expectedMode: 'SIMULATION',
    expectedSubjectCode: 'MATHEMATICS',
    expectedActionKind: 'OPEN_ROUTE',
    expectedPrimaryHref: '/student/training/simulation?subject=MATHEMATICS',
  },
  {
    id: 'simulation-mock-exam',
    command: 'mock exam complet f maths',
    expectedMode: 'SIMULATION',
    expectedSubjectCode: 'MATHEMATICS',
    expectedActionKind: 'OPEN_ROUTE',
    expectedPrimaryHref: '/student/training/simulation?subject=MATHEMATICS',
  },
  {
    id: 'continue-active-session',
    command: 'واصل الجلسة لي حبست فيها',
    expectedMode: 'CONTINUE_SESSION',
    expectedActionKind: 'OPEN_ROUTE',
    expectedPrimaryHref: '/student/training/session-1',
  },
  {
    id: 'mistake-repair',
    command: 'أريد إصلاح أخطائي في الفيزياء',
    expectedMode: 'MISTAKE_REPAIR',
    expectedSubjectCode: 'PHYSICS',
  },
  {
    id: 'mistake-repair-weak-context',
    command: 'أريد جلسة قصيرة لإصلاح نقطة ضعفي',
    expectedMode: 'MISTAKE_REPAIR',
    expectedSubjectCode: 'MATH',
    expectedTopicCodes: ['FUNCTIONS'],
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
    id: 'library-annales-svt',
    command: 'annales bac 2024 svt',
    expectedMode: 'LIBRARY_SEARCH',
    expectedSubjectCode: 'NATURAL_SCIENCES',
  },
  {
    id: 'missing-subject-clarification',
    command: 'أريد تدريب BAC آخر 3 سنوات',
    expectedMode: 'BAC_TRAINING',
    expectsClarification: true,
    context: 'empty',
  },
  {
    id: 'missing-subject-with-context-still-clarifies',
    command: 'أريد تدريب BAC آخر 3 سنوات',
    expectedMode: 'BAC_TRAINING',
    expectsClarification: true,
  },
];
