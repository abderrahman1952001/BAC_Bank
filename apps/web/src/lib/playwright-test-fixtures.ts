import type { AuthOptionsResponse, AuthUser } from "@bac-bank/contracts/auth";
import type { AdminBillingSettingsResponse } from "@bac-bank/contracts/admin";
import type {
  BillingCheckoutResponse,
  BillingOverviewResponse,
  BillingPlan,
} from "@bac-bank/contracts/billing";
import type {
  CourseConceptResponse,
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from "@bac-bank/contracts/courses";
import type {
  AdminIngestionCropQueueResponse,
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
} from "@bac-bank/contracts/ingestion";
import type {
  LabToolMissionsResponse,
  LabToolsResponse,
} from "@bac-bank/contracts/lab";
import { mathGeometryComplexPresets } from "@/lib/lab-math-geometry-complex-plane";
import { mathProbabilityWorkbenchPresets } from "@/lib/lab-math-probability-workbench";
import { mathSequencesWorkbenchPresets } from "@/lib/lab-math-sequences-workbench";
import { physicsChemistryReactionWorkbenchPresets } from "@/lib/lab-physics-chemistry-reaction-workbench";
import { physicsCircuitsWorkbenchPresets } from "@/lib/lab-physics-circuits-workbench";
import { physicsExperimentGraphPresets } from "@/lib/lab-physics-experiment-graphs";
import { physicsMechanicsWorkbenchPresets } from "@/lib/lab-physics-mechanics-workbench";
import type {
  CatalogResponse,
  ExamResponse,
  FiltersResponse,
  MyMistakesResponse,
  RecentExerciseStatesResponse,
  CurriculumJourneysResponse,
  StudySessionResponse,
  SessionPreviewResponse,
  WeakPointInsightsResponse,
} from "@bac-bank/contracts/study";
import { civilBeamStaticsWorkbenchPresets } from "@/lib/lab-civil-beam-statics-workbench";
import { civilStructuresMaterialsWorkbenchPresets } from "@/lib/lab-civil-structures-materials-workbench";
import { civilTechnicalSheetWorkbenchPresets } from "@/lib/lab-civil-technical-sheet-workbench";
import { electricalControlLogicWorkbenchPresets } from "@/lib/lab-electrical-control-logic-workbench";
import { electricalCircuitsChronogramsWorkbenchPresets } from "@/lib/lab-electrical-circuits-chronograms-workbench";
import { electricalTechnicalFileWorkbenchPresets } from "@/lib/lab-electrical-technical-file-workbench";
import { mechanicalDrawingWorkbenchPresets } from "@/lib/lab-mechanical-drawing-workbench";
import { mechanicalManufacturingTolerancesWorkbenchPresets } from "@/lib/lab-mechanical-manufacturing-tolerances-workbench";
import { mechanicalMechanismKinematicsWorkbenchPresets } from "@/lib/lab-mechanical-mechanism-kinematics-workbench";
import { processFlowInstrumentationWorkbenchPresets } from "@/lib/lab-process-flow-instrumentation-workbench";
import { processMaterialBalanceAdvancementWorkbenchPresets } from "@/lib/lab-process-material-balance-advancement-workbench";
import { processReactionWorkbenchPresets } from "@/lib/lab-process-reaction-workbench";
import { svtDocumentWorkbenchPresets } from "@/lib/lab-svt-document-workbench";
import { svtDiagramLabelingWorkbenchPresets } from "@/lib/lab-svt-diagram-labeling-workbench";
import { svtEnergyMetabolismWorkbenchPresets } from "@/lib/lab-svt-energy-metabolism-workbench";
import { svtExperimentalGraphTablePresets } from "@/lib/lab-svt-experimental-graph-table";
import { svtNervousImmuneResponseWorkbenchPresets } from "@/lib/lab-svt-nervous-immune-response-workbench";
import { svtTectonicsWorkbenchPresets } from "@/lib/lab-svt-tectonics-workbench";

const playwrightFreeStudyEntitlements = {
  tier: "FREE",
  capabilities: {
    topicDrill: true,
    mixedDrill: true,
    weakPointDrill: false,
    paperSimulation: true,
    aiExplanation: false,
    weakPointInsight: false,
  },
  quotas: {
    drillStarts: {
      monthlyLimit: 5,
      used: 1,
      remaining: 4,
      exhausted: false,
      nearLimit: false,
      resetsAt: "2026-04-30T23:00:00.000Z",
    },
    simulationStarts: {
      monthlyLimit: 1,
      used: 0,
      remaining: 1,
      exhausted: false,
      nearLimit: false,
      resetsAt: "2026-04-30T23:00:00.000Z",
    },
  },
} satisfies AuthUser["studyEntitlements"];

export const playwrightTestStudentUser = {
  id: "student-test-user",
  username: "Sara",
  email: "sara@example.com",
  role: "STUDENT",
  stream: {
    code: "SE",
    name: "Sciences experimentales",
  },
  subscriptionStatus: "FREE",
  subscriptionEndsAt: null,
  studyEntitlements: playwrightFreeStudyEntitlements,
} satisfies AuthUser;

export const playwrightTestAdminUser = {
  id: "admin-test-user",
  username: "مشرف مِراس",
  email: "admin@example.com",
  role: "ADMIN",
  stream: {
    code: "SE",
    name: "Sciences experimentales",
  },
  subscriptionStatus: "FREE",
  subscriptionEndsAt: null,
  studyEntitlements: playwrightFreeStudyEntitlements,
} satisfies AuthUser;

export const playwrightTestAuthOptions = {
  streamFamilies: [
    {
      code: "SE",
      name: "Sciences experimentales",
      streams: [
        {
          code: "SE",
          name: "Sciences experimentales",
          isDefault: true,
        },
      ],
    },
  ],
} satisfies AuthOptionsResponse;

export const playwrightTestLabTools = {
  data: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      slug: "function-explorer",
      title: "مستكشف الدوال",
      description: "مهمات قصيرة تربط المنحنى بالجذور وجدول القيم.",
      status: "READY",
      metadata: {
        subjectSlug: "math",
      },
      subject: {
        code: "MATHEMATICS",
        name: "الرياضيات",
      },
      missionCount: 3,
      completedMissionCount: 1,
      inProgressMissionCount: 1,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "19191919-1919-4919-9919-191919191919",
      slug: "math-probability-workbench",
      title: "ورشة الاحتمالات",
      description: "شجرات، جداول قانون احتمال، واحتمال شرطي.",
      status: "READY",
      metadata: {
        subjectSlug: "math",
      },
      subject: {
        code: "MATHEMATICS",
        name: "الرياضيات",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "1e1e1e1e-1e1e-4e1e-9e1e-1e1e1e1e1e1e",
      slug: "math-sequences-workbench",
      title: "ورشة المتتاليات",
      description: "حدود، علاقة تراجعية، رتابة، وتحويل هندسي.",
      status: "READY",
      metadata: {
        subjectSlug: "math",
      },
      subject: {
        code: "MATHEMATICS",
        name: "الرياضيات",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "23232323-2323-4323-9323-232323232323",
      slug: "math-geometry-complex-plane",
      title: "ورشة الهندسة والمستوى المركب",
      description: "نقاط، لواحق، متجهات، مسافات، وتحويلات.",
      status: "READY",
      metadata: {
        subjectSlug: "math",
      },
      subject: {
        code: "MATHEMATICS",
        name: "الرياضيات",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "28282828-2828-4828-9828-282828282828",
      slug: "physics-experiment-graphs",
      title: "منحنيات التجربة",
      description: "ميل، ثابت زمني، وحدات، واستنتاج تجريبي.",
      status: "READY",
      metadata: {
        subjectSlug: "physics",
      },
      subject: {
        code: "PHYSICS",
        name: "العلوم الفيزيائية",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "30303030-3030-4030-9030-303030303030",
      slug: "physics-circuits-workbench",
      title: "ورشة الدارات الكهربائية",
      description: "RC/RL، مخططات، ثابت الزمن، ووحدات.",
      status: "READY",
      metadata: {
        subjectSlug: "physics",
      },
      subject: {
        code: "PHYSICS",
        name: "العلوم الفيزيائية",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-9333-333333333333",
      slug: "physics-mechanics-workbench",
      title: "ورشة الميكانيك",
      description: "قوى، حركة، ميل منحنى، واهتزازات.",
      status: "READY",
      metadata: {
        subjectSlug: "physics",
      },
      subject: {
        code: "PHYSICS",
        name: "العلوم الفيزيائية",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "36363636-3636-4636-9636-363636363636",
      slug: "physics-chemistry-reaction-workbench",
      title: "ورشة الكيمياء والتفاعلات",
      description: "معايرة، جداول تقدم، منحنيات، وتركيز.",
      status: "READY",
      metadata: {
        subjectSlug: "physics",
      },
      subject: {
        code: "PHYSICS",
        name: "العلوم الفيزيائية",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      slug: "dna-to-protein",
      title: "من DNA إلى بروتين",
      description: "مهمات قصيرة لتحويل DNA إلى mRNA وفهم أثر الطفرات.",
      status: "READY",
      metadata: {
        subjectSlug: "svt",
      },
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "99999999-9999-9999-9999-999999999999",
      slug: "svt-document-workbench",
      title: "ورشة الوثائق والمنحنيات",
      description: "قراءة وثائق، اختيار أدلة، وبناء استنتاج.",
      status: "READY",
      metadata: {
        subjectSlug: "svt",
      },
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "12121212-1212-4212-9212-121212121212",
      slug: "svt-experimental-graph-table",
      title: "ورشة المنحنيات والجداول التجريبية",
      description: "تجارب، جداول، منحنيات، واستنتاج علمي.",
      status: "READY",
      metadata: {
        subjectSlug: "svt",
      },
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "3b3b3b3b-3b3b-4b3b-9b3b-3b3b3b3b3b3b",
      slug: "svt-diagram-labeling-workbench",
      title: "ورشة تسمية الرسوم الحيوية",
      description: "مواقع فعالة، عضيات، وبنيات حيوية.",
      status: "READY",
      metadata: {
        subjectSlug: "svt",
      },
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "40404040-4040-4040-9040-404040404040",
      slug: "svt-energy-metabolism-workbench",
      title: "ورشة الطاقة الخلوية",
      description: "تركيب ضوئي، تنفس، تخمر، وATP.",
      status: "READY",
      metadata: {
        subjectSlug: "svt",
      },
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "44444444-4444-4444-9444-444444444444",
      slug: "svt-nervous-immune-response-workbench",
      title: "ورشة الاستجابة العصبية والمناعية",
      description: "منعكسات، مشابك، خلايا مناعية، وأجسام مضادة.",
      status: "READY",
      metadata: {
        subjectSlug: "svt",
      },
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "4a4a4a4a-4a4a-4a4a-9a4a-4a4a4a4a4a4a",
      slug: "svt-tectonics-workbench",
      title: "ورشة التكتونية",
      description: "خرائط، مقاطع، زلازل، وحركة صفائح.",
      status: "READY",
      metadata: {
        subjectSlug: "svt",
      },
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "50505050-5050-4050-9050-505050505050",
      slug: "technology-civil-beam-statics",
      title: "تحليل الجوائز",
      description: "ردود أفعال، مخططات قوى، وجداول مقاطع.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-civil",
      },
      subject: {
        code: "TECHNOLOGY_CIVIL",
        name: "التكنولوجيا (هندسة مدنية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "55555555-5555-4555-9555-555555555555",
      slug: "technology-civil-structures-materials",
      title: "ورشة المنشآت والمواد",
      description: "مقاطع، خرسانة مسلحة، فولاذ، وإجهادات.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-civil",
      },
      subject: {
        code: "TECHNOLOGY_CIVIL",
        name: "التكنولوجيا (هندسة مدنية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "5a5a5a5a-5a5a-4a5a-9a5a-5a5a5a5a5a5a",
      slug: "technology-civil-technical-sheet",
      title: "ورشة البطاقة التقنية المدنية",
      description: "مخططات، كميات، مراحل إنجاز، وملف إجابة.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-civil",
      },
      subject: {
        code: "TECHNOLOGY_CIVIL",
        name: "التكنولوجيا (هندسة مدنية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "60606060-6060-4060-9060-606060606060",
      slug: "technology-electrical-control-logic",
      title: "التحكم والمنطق",
      description: "GRAFCET، جداول صدق، خرائط Karnaugh، وكرونوغرام.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-electrical",
      },
      subject: {
        code: "TECHNOLOGY_ELECTRICAL",
        name: "التكنولوجيا (هندسة كهربائية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "65656565-6565-4565-9565-656565656565",
      slug: "technology-electrical-circuits-chronograms",
      title: "ورشة الدارات والكرونوغرامات",
      description: "مرحلات، تلامسات، مؤقتات، وإشارات زمنية.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-electrical",
      },
      subject: {
        code: "TECHNOLOGY_ELECTRICAL",
        name: "التكنولوجيا (هندسة كهربائية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "69696969-6969-4969-9969-696969696969",
      slug: "technology-electrical-technical-file",
      title: "ورشة الملف التقني الكهربائي",
      description: "مكونات، بطاقات محرك، حماية، وملف إجابة.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-electrical",
      },
      subject: {
        code: "TECHNOLOGY_ELECTRICAL",
        name: "التكنولوجيا (هندسة كهربائية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "70707070-7070-4070-9070-707070707070",
      slug: "technology-mechanical-drawing-workbench",
      title: "ورشة الرسم الميكانيكي",
      description: "رسم تجميعي، مدونة قطع، مقاطع، سماحات، وخشونة.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-mechanical",
      },
      subject: {
        code: "TECHNOLOGY_MECHANICAL",
        name: "التكنولوجيا (هندسة ميكانيكية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "75757575-7575-4575-9575-757575757575",
      slug: "technology-mechanical-mechanism-kinematics",
      title: "ورشة الآليات والحركيات",
      description: "نسب نقل، تروس، تحويل حركة، وسرعات/إزاحات.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-mechanical",
      },
      subject: {
        code: "TECHNOLOGY_MECHANICAL",
        name: "التكنولوجيا (هندسة ميكانيكية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "79797979-7979-4979-9979-797979797979",
      slug: "technology-mechanical-manufacturing-tolerances",
      title: "ورشة التصنيع والتسامحات",
      description: "تحضير تصنيع، عمليات، أدوات مراقبة، وتساميحات/تلاؤم.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-mechanical",
      },
      subject: {
        code: "TECHNOLOGY_MECHANICAL",
        name: "التكنولوجيا (هندسة ميكانيكية)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "80808080-8080-4080-9080-808080808080",
      slug: "technology-process-reaction-workbench",
      title: "ورشة مخططات التفاعل",
      description: "أسترة، بلمرة، عائلات عضوية، شروط، ونواتج.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-process",
      },
      subject: {
        code: "TECHNOLOGY_PROCESS",
        name: "التكنولوجيا (هندسة الطرائق)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "85858585-8585-4585-9585-858585858585",
      slug: "technology-process-material-balance-advancement",
      title: "ورشة الموازنة والتقدم",
      description: "مردود، كتل، جداول تقدم، ومتفاعل محد.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-process",
      },
      subject: {
        code: "TECHNOLOGY_PROCESS",
        name: "التكنولوجيا (هندسة الطرائق)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
    {
      id: "89898989-8989-4989-9989-898989898989",
      slug: "technology-process-flow-instrumentation",
      title: "ورشة الجريان والقياس",
      description: "PFD، تجهيزات، تيارات، رموز قياس، وتحكم.",
      status: "READY",
      metadata: {
        subjectSlug: "technology-process",
      },
      subject: {
        code: "TECHNOLOGY_PROCESS",
        name: "التكنولوجيا (هندسة الطرائق)",
      },
      missionCount: 2,
      completedMissionCount: 0,
      inProgressMissionCount: 0,
      createdAt: "2026-05-13T08:00:00.000Z",
      updatedAt: "2026-05-13T08:00:00.000Z",
    },
  ],
} satisfies LabToolsResponse;

export const playwrightTestLabToolMissionsBySlug: Record<
  string,
  LabToolMissionsResponse
> = {
  "function-explorer": {
    tool: playwrightTestLabTools.data[0],
    missions: [
      {
        mission: {
          id: "33333333-3333-3333-3333-333333333333",
          toolId: "11111111-1111-1111-1111-111111111111",
          title: "اقرأ جذور المنحنى",
          goal: "استعمل الدالة المقترحة لتحديد حلول f(x)=0 تقريبياً ثم قارِنها بجدول القيم.",
          preset: {
            expression: "x^2 - 4*x + 3",
          },
          exitCheck: {
            kind: "ROOTS_NEAR",
            expectedRoots: [1, 3],
            tolerance: 0.25,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "44444444-4444-4444-4444-444444444444",
            code: "FUNCTIONS",
            name: "الدوال",
            slug: "functions",
          },
          learningTarget: {
            id: "55555555-5555-5555-5555-555555555555",
            code: "FUNCTION_ANALYSIS",
            name: "تحليل الدوال",
            slug: "function-analysis",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: {
          id: "66666666-6666-6666-6666-666666666666",
          missionId: "33333333-3333-3333-3333-333333333333",
          status: "IN_PROGRESS",
          resultJson: null,
          startedAt: "2026-05-13T08:00:00.000Z",
          completedAt: null,
        },
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "77777777-7777-7777-7777-777777777777",
          toolId: "11111111-1111-1111-1111-111111111111",
          title: "استنتج مجالات الإشارة",
          goal: "لاحظ أين تكون الدالة موجبة أو سالبة قبل كتابة جدول الإشارة.",
          preset: null,
          exitCheck: null,
          orderIndex: 2,
          curriculumNode: {
            id: "44444444-4444-4444-4444-444444444444",
            code: "FUNCTIONS",
            name: "الدوال",
            slug: "functions",
          },
          learningTarget: {
            id: "55555555-5555-5555-5555-555555555555",
            code: "FUNCTION_ANALYSIS",
            name: "تحليل الدوال",
            slug: "function-analysis",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 1,
      },
    ],
  },
  "math-probability-workbench": {
    tool: playwrightTestLabTools.data[1],
    missions: [
      {
        mission: {
          id: "1a1a1a1a-1a1a-4a1a-9a1a-1a1a1a1a1a1a",
          toolId: "19191919-1919-4919-9919-191919191919",
          title: "أكمل شجرة احتمال واحسب تقاطعا",
          goal: "املأ الفروع الناقصة في شجرة احتمال على مرحلتين، ثم احسب P(A∩B) باستعمال قاعدة الضرب.",
          preset: mathProbabilityWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: mathProbabilityWorkbenchPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "1b1b1b1b-1b1b-4b1b-9b1b-1b1b1b1b1b1b",
            code: "PROBABILITY",
            name: "الاحتمالات والإحصاء",
            slug: "probability",
          },
          learningTarget: {
            id: "1c1c1c1c-1c1c-4c1c-9c1c-1c1c1c1c1c1c",
            code: "PROBABILITY_MODELING",
            name: "النمذجة في الاحتمالات",
            slug: "probability-modeling",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "1d1d1d1d-1d1d-4d1d-9d1d-1d1d1d1d1d1d",
          toolId: "19191919-1919-4919-9919-191919191919",
          title: "أتمم قانون احتمال واحسب الأمل",
          goal: "املأ قانون احتمال المتغير X ثم احسب E(X) من مجموع x×P(X=x).",
          preset: mathProbabilityWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: mathProbabilityWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "1b1b1b1b-1b1b-4b1b-9b1b-1b1b1b1b1b1b",
            code: "PROBABILITY",
            name: "الاحتمالات والإحصاء",
            slug: "probability",
          },
          learningTarget: {
            id: "1c1c1c1c-1c1c-4c1c-9c1c-1c1c1c1c1c1c",
            code: "PROBABILITY_MODELING",
            name: "النمذجة في الاحتمالات",
            slug: "probability-modeling",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "math-sequences-workbench": {
    tool: playwrightTestLabTools.data[2],
    missions: [
      {
        mission: {
          id: "1f1f1f1f-1f1f-4f1f-9f1f-1f1f1f1f1f1f",
          toolId: "1e1e1e1e-1e1e-4e1e-9e1e-1e1e1e1e1e1e",
          title: "حلل متتالية تراجعية بنقطة تثبيت",
          goal: "أكمل حدود uₙ و vₙ، بين أن vₙ هندسية، ثم استنتج اتجاه الحدود ونهاية uₙ.",
          preset: mathSequencesWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: mathSequencesWorkbenchPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "20202020-2020-4020-9020-202020202020",
            code: "SEQUENCES",
            name: "المتتاليات",
            slug: "sequences",
          },
          learningTarget: {
            id: "21212121-2121-4121-9121-212121212121",
            code: "SEQUENCE_PROOF",
            name: "البرهان في المتتاليات",
            slug: "sequence-proof",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "22222222-2222-4222-9222-222222222222",
          toolId: "1e1e1e1e-1e1e-4e1e-9e1e-1e1e1e1e1e1e",
          title: "تحقق من حد واحسب مجموعا",
          goal: "استعمل صيغة uₙ=3n-9 لتحديد الأساس ورتبة الحد 2025 ثم حساب مجموع جزئي.",
          preset: mathSequencesWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: mathSequencesWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "20202020-2020-4020-9020-202020202020",
            code: "SEQUENCES",
            name: "المتتاليات",
            slug: "sequences",
          },
          learningTarget: {
            id: "21212121-2121-4121-9121-212121212121",
            code: "SEQUENCE_PROOF",
            name: "البرهان في المتتاليات",
            slug: "sequence-proof",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "math-geometry-complex-plane": {
    tool: playwrightTestLabTools.data[3],
    missions: [
      {
        mission: {
          id: "24242424-2424-4424-9424-242424242424",
          toolId: "23232323-2323-4323-9323-232323232323",
          title: "استنتج دائرة وطبيعة مثلث من اللواحق",
          goal: "أكمل الأطوال والحجج، ثم استنتج الدائرة وطبيعة المثلث من نقاط المستوى المركب.",
          preset: mathGeometryComplexPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: mathGeometryComplexPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "25252525-2525-4525-9525-252525252525",
            code: "COMPLEX_NUMBERS",
            name: "الأعداد المركبة",
            slug: "complex-numbers",
          },
          learningTarget: {
            id: "26262626-2626-4626-9626-262626262626",
            code: "COMPLEX_NUMBER_MANIPULATION",
            name: "التعامل مع الأعداد المركبة",
            slug: "complex-number-manipulation",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "27272727-2727-4727-9727-272727272727",
          toolId: "23232323-2323-4323-9323-232323232323",
          title: "اقرأ متجهة وترجمة من فروق اللواحق",
          goal: "احسب zB-zA و zC-zB، ثم استنتج الاستقامية وصورة B بترجمة.",
          preset: mathGeometryComplexPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: mathGeometryComplexPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "25252525-2525-4525-9525-252525252525",
            code: "COMPLEX_NUMBERS",
            name: "الأعداد المركبة",
            slug: "complex-numbers",
          },
          learningTarget: {
            id: "26262626-2626-4626-9626-262626262626",
            code: "COMPLEX_NUMBER_MANIPULATION",
            name: "التعامل مع الأعداد المركبة",
            slug: "complex-number-manipulation",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "physics-experiment-graphs": {
    tool: playwrightTestLabTools.data[4],
    missions: [
      {
        mission: {
          id: "29292929-2929-4929-9929-292929292929",
          toolId: "28282828-2828-4828-9828-282828282828",
          title: "استخرج ثابت الزمن من منحنى RC",
          goal: "اقرأ القيمة النهائية و0.63E من منحنى الشحن ثم استنتج ثابت الزمن τ.",
          preset: physicsExperimentGraphPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: physicsExperimentGraphPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "2a2a2a2a-2a2a-4a2a-9a2a-2a2a2a2a2a2a",
            code: "RC_RL_CIRCUITS",
            name: "دارات RC و RL",
            slug: "rc-rl-circuits",
          },
          learningTarget: {
            id: "2b2b2b2b-2b2b-4b2b-9b2b-2b2b2b2b2b2b",
            code: "CIRCUIT_TRANSIENT_ANALYSIS",
            name: "تحليل الدارات الانتقالية",
            slug: "circuit-transient-analysis",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "2c2c2c2c-2c2c-4c2c-9c2c-2c2c2c2c2c2c",
          toolId: "28282828-2828-4828-9828-282828282828",
          title: "اقرأ التسارع من منحنى السرعة",
          goal: "استعمل v(t) لاستخراج السرعة الابتدائية والميل ثم حدد طبيعة الحركة.",
          preset: physicsExperimentGraphPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: physicsExperimentGraphPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "2d2d2d2d-2d2d-4d2d-9d2d-2d2d2d2d2d2d",
            code: "MECHANICS",
            name: "الميكانيك",
            slug: "mechanics",
          },
          learningTarget: {
            id: "2e2e2e2e-2e2e-4e2e-9e2e-2e2e2e2e2e2e",
            code: "MECHANICS_REASONING",
            name: "الاستدلال في الميكانيك",
            slug: "mechanics-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "physics-circuits-workbench": {
    tool: playwrightTestLabTools.data[5],
    missions: [
      {
        mission: {
          id: "31313131-3131-4131-9131-313131313131",
          toolId: "30303030-3030-4030-9030-303030303030",
          title: "احسب سعة مكثفة من τ في دارة RC",
          goal: "سمّ عناصر دارة RC، حوّل ثابت الزمن، ثم احسب سعة المكثفة بوحدة صحيحة.",
          preset: physicsCircuitsWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              physicsCircuitsWorkbenchPresets[0].expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "2a2a2a2a-2a2a-4a2a-9a2a-2a2a2a2a2a2a",
            code: "RC_RL_CIRCUITS",
            name: "دارات RC و RL",
            slug: "rc-rl-circuits",
          },
          learningTarget: {
            id: "2b2b2b2b-2b2b-4b2b-9b2b-2b2b2b2b2b2b",
            code: "CIRCUIT_TRANSIENT_ANALYSIS",
            name: "تحليل الدارات الانتقالية",
            slug: "circuit-transient-analysis",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "32323232-3232-4232-9232-323232323232",
          toolId: "30303030-3030-4030-9030-303030303030",
          title: "استخرج معامل تحريض وشيعة من τ في دارة RL",
          goal: "حدد عناصر دارة RL، استعمل العلاقة τ=L/R، ثم اكتب L بوحدة الهنري.",
          preset: physicsCircuitsWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              physicsCircuitsWorkbenchPresets[1].expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "2a2a2a2a-2a2a-4a2a-9a2a-2a2a2a2a2a2a",
            code: "RC_RL_CIRCUITS",
            name: "دارات RC و RL",
            slug: "rc-rl-circuits",
          },
          learningTarget: {
            id: "2b2b2b2b-2b2b-4b2b-9b2b-2b2b2b2b2b2b",
            code: "CIRCUIT_TRANSIENT_ANALYSIS",
            name: "تحليل الدارات الانتقالية",
            slug: "circuit-transient-analysis",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "physics-mechanics-workbench": {
    tool: playwrightTestLabTools.data[6],
    missions: [
      {
        mission: {
          id: "34343434-3434-4434-9434-343434343434",
          toolId: "33333333-3333-4333-9333-333333333333",
          title: "استخرج محصلة القوى من منحنى السرعة",
          goal: "سمّ قوى جسم على مستوى مائل، اقرأ التسارع من v(t)، ثم طبق ΣF=m.a.",
          preset: physicsMechanicsWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              physicsMechanicsWorkbenchPresets[0].expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "2d2d2d2d-2d2d-4d2d-9d2d-2d2d2d2d2d2d",
            code: "MECHANICS",
            name: "الميكانيك",
            slug: "mechanics",
          },
          learningTarget: {
            id: "2e2e2e2e-2e2e-4e2e-9e2e-2e2e2e2e2e2e",
            code: "MECHANICS_REASONING",
            name: "الاستدلال في الميكانيك",
            slug: "mechanics-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "35353535-3535-4535-9535-353535353535",
          toolId: "33333333-3333-4333-9333-333333333333",
          title: "احسب صلابة نابض من دور الاهتزاز",
          goal: "اقرأ الدور من x(t)، استعمل علاقة النواس المرن، ثم احسب k بوحدة N/m.",
          preset: physicsMechanicsWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              physicsMechanicsWorkbenchPresets[1].expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "2d2d2d2d-2d2d-4d2d-9d2d-2d2d2d2d2d2d",
            code: "MECHANICS",
            name: "الميكانيك",
            slug: "mechanics",
          },
          learningTarget: {
            id: "2e2e2e2e-2e2e-4e2e-9e2e-2e2e2e2e2e2e",
            code: "MECHANICS_REASONING",
            name: "الاستدلال في الميكانيك",
            slug: "mechanics-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "physics-chemistry-reaction-workbench": {
    tool: playwrightTestLabTools.data[7],
    missions: [
      {
        mission: {
          id: "37373737-3737-4737-9737-373737373737",
          toolId: "36363636-3636-4636-9636-363636363636",
          title: "احسب تركيز حمض من منحنى معايرة",
          goal: "اقرأ حجم التكافؤ من منحنى pH، ثم استعمل علاقة التكافؤ لحساب CA.",
          preset: physicsChemistryReactionWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              physicsChemistryReactionWorkbenchPresets[0].expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "38383838-3838-4838-9838-383838383838",
            code: "CHEMICAL_TRANSFORMATIONS",
            name: "التحولات الكيميائية",
            slug: "chemical-transformations",
          },
          learningTarget: {
            id: "39393939-3939-4939-9939-393939393939",
            code: "CHEMICAL_TRANSFORMATION_REASONING",
            name: "الاستدلال في التحولات الكيميائية",
            slug: "chemical-transformation-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "3a3a3a3a-3a3a-4a3a-9a3a-3a3a3a3a3a3a",
          toolId: "36363636-3636-4636-9636-363636363636",
          title: "أكمل جدول تقدم وحدد المتفاعل المحد",
          goal: "استعمل معاملات المعادلة لتحديد xmax والمتفاعل المحد وكمية H₂.",
          preset: physicsChemistryReactionWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              physicsChemistryReactionWorkbenchPresets[1].expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "38383838-3838-4838-9838-383838383838",
            code: "CHEMICAL_TRANSFORMATIONS",
            name: "التحولات الكيميائية",
            slug: "chemical-transformations",
          },
          learningTarget: {
            id: "39393939-3939-4939-9939-393939393939",
            code: "CHEMICAL_TRANSFORMATION_REASONING",
            name: "الاستدلال في التحولات الكيميائية",
            slug: "chemical-transformation-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "dna-to-protein": {
    tool: playwrightTestLabTools.data[8],
    missions: [
      {
        mission: {
          id: "88888888-8888-8888-8888-888888888888",
          toolId: "22222222-2222-2222-2222-222222222222",
          title: "حوّل DNA إلى mRNA",
          goal: "اتبع قواعد التكامل لتحويل السلسلة إلى mRNA ثم قسّمها إلى رامزات.",
          preset: {
            dna: "ATGCTTGAA",
          },
          exitCheck: {
            kind: "MRNA_AND_CODONS",
            expectedMrna: "AUGCUUGAA",
            expectedCodons: ["AUG", "CUU", "GAA"],
          },
          orderIndex: 1,
          curriculumNode: {
            id: "99999999-9999-9999-9999-999999999999",
            code: "PROTEIN_SYNTHESIS",
            name: "تركيب البروتين",
            slug: "protein-synthesis",
          },
          learningTarget: {
            id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
            code: "PROTEIN_FUNCTION_REASONING",
            name: "الاستدلال في البروتينات",
            slug: "protein-function-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "svt-document-workbench": {
    tool: playwrightTestLabTools.data[9],
    missions: [
      {
        mission: {
          id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
          toolId: "99999999-9999-9999-9999-999999999999",
          title: "فسّر مرضا انطلاقا من وثائق المستقبل R",
          goal: "اختر الأدلة التي تربط الطفرة بتغير بنية المستقبل ثم اكتب استنتاجا يفسر تراكم LDL عند المصاب.",
          preset: svtDocumentWorkbenchPresets[0],
          exitCheck: {
            kind: "DOCUMENT_EVIDENCE",
            requiredEvidenceIds:
              svtDocumentWorkbenchPresets[0].prompt.requiredEvidenceIds,
            requiredConclusionKeywords:
              svtDocumentWorkbenchPresets[0].prompt
                .requiredConclusionKeywords,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
            code: "STRUCTURE_FUNCTION",
            name: "العلاقة بين البنية والوظيفة",
            slug: "structure-function",
          },
          learningTarget: {
            id: "dddddddd-dddd-4ddd-dddd-dddddddddddd",
            code: "PROTEIN_FUNCTION_REASONING",
            name: "الاستدلال في البروتينات",
            slug: "protein-function-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee",
          toolId: "99999999-9999-9999-9999-999999999999",
          title: "ابن نصا علميا من وثائق تركيب البروتين",
          goal: "اختر أدلة سلسلة ADN إلى ARNm إلى أحماض أمينية، ثم اكتب خلاصة تربط ترتيب المعلومة بالبنية الفراغية.",
          preset: svtDocumentWorkbenchPresets[1],
          exitCheck: {
            kind: "DOCUMENT_EVIDENCE",
            requiredEvidenceIds:
              svtDocumentWorkbenchPresets[1].prompt.requiredEvidenceIds,
            requiredConclusionKeywords:
              svtDocumentWorkbenchPresets[1].prompt
                .requiredConclusionKeywords,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "ffffffff-ffff-4fff-ffff-ffffffffffff",
            code: "PROTEIN_SYNTHESIS",
            name: "تركيب البروتين",
            slug: "protein-synthesis",
          },
          learningTarget: {
            id: "abababab-abab-4aba-abab-abababababab",
            code: "DOCUMENT_ANALYSIS",
            name: "تحليل الوثائق",
            slug: "document-analysis",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "svt-experimental-graph-table": {
    tool: playwrightTestLabTools.data[10],
    missions: [
      {
        mission: {
          id: "13131313-1313-4313-9313-131313131313",
          toolId: "12121212-1212-4212-9212-121212121212",
          title: "حلل تأثير Glucobay على نشاط الإنزيم",
          goal: "اقرأ القيمتين عند 25 mmol، قارن المنحنيين، ثم اكتب استنتاجا يفسر أثر الدواء على نسبة الغلوكوز.",
          preset: svtExperimentalGraphTablePresets[0],
          exitCheck: {
            kind: "SVT_EXPERIMENTAL_GRAPH_TABLE",
            expectedReadings:
              svtExperimentalGraphTablePresets[0].expectedReadings,
            requiredObservationIds:
              svtExperimentalGraphTablePresets[0].prompt
                .requiredObservationIds,
            requiredConclusionKeywords:
              svtExperimentalGraphTablePresets[0].prompt
                .requiredConclusionKeywords,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "14141414-1414-4414-9414-141414141414",
            code: "ENZYMES",
            name: "الإنزيمات",
            slug: "enzymes",
          },
          learningTarget: {
            id: "15151515-1515-4515-9515-151515151515",
            code: "ENZYME_ACTIVITY_GRAPHS",
            name: "تحليل منحنيات النشاط الإنزيمي",
            slug: "enzyme-activity-graphs",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "16161616-1616-4616-9616-161616161616",
          toolId: "12121212-1212-4212-9212-121212121212",
          title: "حدد pH الأمثل لنشاط إنزيمي",
          goal: "استخرج pH الأمثل من الجدول والمنحنى، ثم فسر لماذا ينخفض النشاط خارج هذا الوسط.",
          preset: svtExperimentalGraphTablePresets[1],
          exitCheck: {
            kind: "SVT_EXPERIMENTAL_GRAPH_TABLE",
            expectedReadings:
              svtExperimentalGraphTablePresets[1].expectedReadings,
            requiredObservationIds:
              svtExperimentalGraphTablePresets[1].prompt
                .requiredObservationIds,
            requiredConclusionKeywords:
              svtExperimentalGraphTablePresets[1].prompt
                .requiredConclusionKeywords,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "17171717-1717-4717-9717-171717171717",
            code: "ENZYMES",
            name: "الإنزيمات",
            slug: "enzymes",
          },
          learningTarget: {
            id: "18181818-1818-4818-9818-181818181818",
            code: "ENZYME_CONDITIONS",
            name: "شروط النشاط الإنزيمي",
            slug: "enzyme-conditions",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "svt-diagram-labeling-workbench": {
    tool: playwrightTestLabTools.data[11],
    missions: [
      {
        mission: {
          id: "3c3c3c3c-3c3c-4c3c-9c3c-3c3c3c3c3c3c",
          toolId: "3b3b3b3b-3b3b-4b3b-9b3b-3b3b3b3b3b3b",
          title: "سمّ موقعا فعالا واربطه بوظيفة الإنزيم",
          goal: "أدخل تسميات الرسم ثم اكتب خلاصة عن التكامل بين الموقع الفعال والركيزة.",
          preset: svtDiagramLabelingWorkbenchPresets[0],
          exitCheck: {
            kind: "DIAGRAM_LABELS",
            targets: svtDiagramLabelingWorkbenchPresets[0].diagram!.targets,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "ffffffff-ffff-4fff-ffff-ffffffffffff",
            code: "PROTEIN_SYNTHESIS",
            name: "تركيب البروتين",
            slug: "protein-synthesis",
          },
          learningTarget: {
            id: "dddddddd-dddd-4ddd-dddd-dddddddddddd",
            code: "PROTEIN_FUNCTION_REASONING",
            name: "الاستدلال في البروتينات",
            slug: "protein-function-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "3d3d3d3d-3d3d-4d3d-9d3d-3d3d3d3d3d3d",
          toolId: "3b3b3b3b-3b3b-4b3b-9b3b-3b3b3b3b3b3b",
          title: "سمّ بلاستيدة خضراء واربط البنية بالتركيب الضوئي",
          goal: "حدد التيلاكويد والغرانا والستروما ثم اربط البنية بمكان حدوث التفاعلات.",
          preset: svtDiagramLabelingWorkbenchPresets[1],
          exitCheck: {
            kind: "DIAGRAM_LABELS",
            targets: svtDiagramLabelingWorkbenchPresets[1].diagram!.targets,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "3e3e3e3e-3e3e-4e3e-9e3e-3e3e3e3e3e3e",
            code: "PHOTOSYNTHESIS",
            name: "التركيب الضوئي",
            slug: "photosynthesis",
          },
          learningTarget: {
            id: "3f3f3f3f-3f3f-4f3f-9f3f-3f3f3f3f3f3f",
            code: "BIOLOGICAL_DATA_INTERPRETATION",
            name: "تفسير المعطيات البيولوجية",
            slug: "biological-data-interpretation",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "svt-energy-metabolism-workbench": {
    tool: playwrightTestLabTools.data[12],
    missions: [
      {
        mission: {
          id: "41414141-4141-4141-9141-414141414141",
          toolId: "40404040-4040-4040-9040-404040404040",
          title: "حلل انطلاق O₂ حسب شدة الإضاءة",
          goal: "اقرأ القيم من المنحنى ثم استنتج دور الضوء وحدود التشبع.",
          preset: svtEnergyMetabolismWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              svtEnergyMetabolismWorkbenchPresets[0].expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "3e3e3e3e-3e3e-4e3e-9e3e-3e3e3e3e3e3e",
            code: "PHOTOSYNTHESIS",
            name: "التركيب الضوئي",
            slug: "photosynthesis",
          },
          learningTarget: {
            id: "3f3f3f3f-3f3f-4f3f-9f3f-3f3f3f3f3f3f",
            code: "BIOLOGICAL_DATA_INTERPRETATION",
            name: "تفسير المعطيات البيولوجية",
            slug: "biological-data-interpretation",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "42424242-4242-4242-9242-424242424242",
          toolId: "40404040-4040-4040-9040-404040404040",
          title: "قارن مردود ATP بين التنفس والتخمر",
          goal: "أكمل جدول المقارنة ثم اربط وجود O₂ بالمردود الطاقوي.",
          preset: svtEnergyMetabolismWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: svtEnergyMetabolismWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "43434343-4343-4343-9343-434343434343",
            code: "RESPIRATION_FERMENTATION",
            name: "التنفس والتخمر",
            slug: "respiration-fermentation",
          },
          learningTarget: {
            id: "3f3f3f3f-3f3f-4f3f-9f3f-3f3f3f3f3f3f",
            code: "BIOLOGICAL_DATA_INTERPRETATION",
            name: "تفسير المعطيات البيولوجية",
            slug: "biological-data-interpretation",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "svt-nervous-immune-response-workbench": {
    tool: playwrightTestLabTools.data[13],
    missions: [
      {
        mission: {
          id: "45454545-4545-4545-9545-454545454545",
          toolId: "44444444-4444-4444-9444-444444444444",
          title: "سمّ قوسا انعكاسية وفسر اتجاه السيالة",
          goal: "حدد عناصر المسار العصبي ثم اربطها باتجاه السيالة والاستجابة.",
          preset: svtNervousImmuneResponseWorkbenchPresets[0],
          exitCheck: {
            kind: "DIAGRAM_LABELS",
            targets:
              svtNervousImmuneResponseWorkbenchPresets[0].diagram!.targets,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "46464646-4646-4646-9646-464646464646",
            code: "NERVOUS_COMMUNICATION",
            name: "الاتصال العصبي",
            slug: "nervous-communication",
          },
          learningTarget: {
            id: "abababab-abab-4aba-abab-abababababab",
            code: "DOCUMENT_ANALYSIS",
            name: "تحليل الوثائق",
            slug: "document-analysis",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "47474747-4747-4747-9747-474747474747",
          toolId: "44444444-4444-4444-9444-444444444444",
          title: "رتب سلسلة الاستجابة المناعية الخلطية",
          goal: "سمّ مولد الضد والخلايا اللمفاوية ثم اربطها بإنتاج الأجسام المضادة.",
          preset: svtNervousImmuneResponseWorkbenchPresets[1],
          exitCheck: {
            kind: "DIAGRAM_LABELS",
            targets:
              svtNervousImmuneResponseWorkbenchPresets[1].diagram!.targets,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "48484848-4848-4848-9848-484848484848",
            code: "IMMUNITY",
            name: "المناعة",
            slug: "immunity",
          },
          learningTarget: {
            id: "49494949-4949-4949-9949-494949494949",
            code: "IMMUNITY_REASONING",
            name: "الاستدلال في المناعة",
            slug: "immunity-reasoning",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "svt-tectonics-workbench": {
    tool: playwrightTestLabTools.data[14],
    missions: [
      {
        mission: {
          id: "4b4b4b4b-4b4b-4b4b-9b4b-4b4b4b4b4b4b",
          toolId: "4a4a4a4a-4a4a-4a4a-9a4a-4a4a4a4a4a4a",
          title: "فسر مقطع اندساس من بؤر زلزالية",
          goal: "سمّ عناصر المقطع ثم استنتج حركة الاندساس من مستوى بنيوف والخندق.",
          preset: svtTectonicsWorkbenchPresets[0],
          exitCheck: {
            kind: "DIAGRAM_LABELS",
            targets: svtTectonicsWorkbenchPresets[0].diagram!.targets,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "4c4c4c4c-4c4c-4c4c-9c4c-4c4c4c4c4c4c",
            code: "TECTONIC_INTERPRETATION",
            name: "التفسير التكتوني",
            slug: "tectonic-interpretation",
          },
          learningTarget: {
            id: "4d4d4d4d-4d4d-4d4d-9d4d-4d4d4d4d4d4d",
            code: "GEOLOGICAL_INTERPRETATION",
            name: "التفسير الجيولوجي",
            slug: "geological-interpretation",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "4e4e4e4e-4e4e-4e4e-9e4e-4e4e4e4e4e4e",
          toolId: "4a4a4a4a-4a4a-4a4a-9a4a-4a4a4a4a4a4a",
          title: "احسب سرعة اتساع عند ذروة محيطية",
          goal: "استعمل المسافة والعمر لحساب سرعة الاتساع واستنتاج التباعد.",
          preset: svtTectonicsWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              svtTectonicsWorkbenchPresets[1].expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "4f4f4f4f-4f4f-4f4f-9f4f-4f4f4f4f4f4f",
            code: "PLATE_ACTIVITY",
            name: "نشاط الصفائح",
            slug: "plate-activity",
          },
          learningTarget: {
            id: "4d4d4d4d-4d4d-4d4d-9d4d-4d4d4d4d4d4d",
            code: "GEOLOGICAL_INTERPRETATION",
            name: "التفسير الجيولوجي",
            slug: "geological-interpretation",
          },
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-civil-beam-statics": {
    tool: playwrightTestLabTools.data[15],
    missions: [
      {
        mission: {
          id: "51515151-5151-4151-9151-515151515151",
          toolId: "50505050-5050-4050-9050-505050505050",
          title: "احسب ردود الأفعال لجائزة بسيطة",
          goal: "سمّ المساند والحمل ثم استعمل التوازن لحساب RA وRB.",
          preset: civilBeamStaticsWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              civilBeamStaticsWorkbenchPresets[0].expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "52525252-5252-4252-9252-525252525252",
            code: "STRENGTH_OF_MATERIALS",
            name: "Résistance des matériaux",
            slug: "strength-of-materials",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "53535353-5353-4353-9353-535353535353",
          toolId: "50505050-5050-4050-9050-505050505050",
          title: "استخرج القص والعزم الأعظميين في كابولي",
          goal: "اقرأ الحمل الموزع ثم احسب Vmax وMmax عند التثبيت.",
          preset: civilBeamStaticsWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              civilBeamStaticsWorkbenchPresets[1].expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "54545454-5454-4454-9454-545454545454",
            code: "SIMPLE_BENDING",
            name: "Flexion simple",
            slug: "simple-bending",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-civil-structures-materials": {
    tool: playwrightTestLabTools.data[16],
    missions: [
      {
        mission: {
          id: "56565656-5656-4656-9656-565656565656",
          toolId: "55555555-5555-4555-9555-555555555555",
          title: "احسب مساحة تسليح الشد",
          goal: "اقرأ مقطع خرسانة مسلحة وجدول القضبان ثم احسب As.",
          preset: civilStructuresMaterialsWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              civilStructuresMaterialsWorkbenchPresets[0].expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "57575757-5757-4757-9757-575757575757",
            code: "REINFORCED_CONCRETE",
            name: "Béton armé",
            slug: "reinforced-concrete",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "58585858-5858-4858-9858-585858585858",
          toolId: "55555555-5555-4555-9555-555555555555",
          title: "تحقق إجهاد مادة من قوة ومقطع",
          goal: "حوّل أبعاد المقطع، احسب σ=N/A، ثم قارنها بالإجهاد المسموح.",
          preset: civilStructuresMaterialsWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              civilStructuresMaterialsWorkbenchPresets[1].expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "59595959-5959-4959-9959-595959595959",
            code: "APPLIED_MECHANICS_TESTS",
            name: "Mécanique appliquée / essais",
            slug: "applied-mechanics-tests",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-civil-technical-sheet": {
    tool: playwrightTestLabTools.data[17],
    missions: [
      {
        mission: {
          id: "5b5b5b5b-5b5b-4b5b-9b5b-5b5b5b5b5b5b",
          toolId: "5a5a5a5a-5a5a-4a5a-9a5a-5a5a5a5a5a5a",
          title: "احسب كمية خرسانة من بطاقة تقنية",
          goal: "استخرج أبعاد أساس شريطي ثم احسب حجم الخرسانة المطلوب.",
          preset: civilTechnicalSheetWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              civilTechnicalSheetWorkbenchPresets[0].expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "5c5c5c5c-5c5c-4c5c-9c5c-5c5c5c5c5c5c",
            code: "BUILDING_STRUCTURE",
            name: "Bâtiment / structure du bâtiment",
            slug: "building-structure",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "5d5d5d5d-5d5d-4d5d-9d5d-5d5d5d5d5d5d",
          toolId: "5a5a5a5a-5a5a-4a5a-9a5a-5a5a5a5a5a5a",
          title: "رتب مراحل إنجاز أساس في ملف الإجابة",
          goal: "أكمل جدول العمليات من التوقيع إلى الصب حسب منطق الإنجاز.",
          preset: civilTechnicalSheetWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: civilTechnicalSheetWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "5c5c5c5c-5c5c-4c5c-9c5c-5c5c5c5c5c5c",
            code: "BUILDING_STRUCTURE",
            name: "Bâtiment / structure du bâtiment",
            slug: "building-structure",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-electrical-control-logic": {
    tool: playwrightTestLabTools.data[18],
    missions: [
      {
        mission: {
          id: "61616161-6161-4161-9161-616161616161",
          toolId: "60606060-6060-4060-9060-606060606060",
          title: "أكمل جدول صدق تشغيل محرك بشرط أمان",
          goal: "استعمل العلاقة KM=M.S لإكمال جدول الصدق وتفسير شرط الأمان.",
          preset: electricalControlLogicWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells:
              electricalControlLogicWorkbenchPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "62626262-6262-4262-9262-626262626262",
            code: "SEQUENTIAL_LOGIC",
            name: "Logique séquentielle",
            slug: "sequential-logic",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "63636363-6363-4363-9363-636363636363",
          toolId: "60606060-6060-4060-9060-606060606060",
          title: "أكمل GRAFCET أسطوانة دفع ورجوع",
          goal: "املأ أفعال الخطوات وشروط الانتقال حسب تسلسل dcy ثم A+ ثم A-.",
          preset: electricalControlLogicWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells:
              electricalControlLogicWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "64646464-6464-4464-9464-646464646464",
            code: "AUTOMATION_GRAFCET_GEMMA",
            name: "Automatisation / GRAFCET / GEMMA",
            slug: "automation-grafcet-gemma",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-electrical-circuits-chronograms": {
    tool: playwrightTestLabTools.data[19],
    missions: [
      {
        mission: {
          id: "66666666-6666-4666-9666-666666666666",
          toolId: "65656565-6565-4565-9565-656565656565",
          title: "اقرأ دارة مرحل واستنتج حالات الخرج",
          goal: "سمّ عناصر الدارة ثم أكمل حالات KA وH حسب حالة S.",
          preset: electricalCircuitsChronogramsWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells:
              electricalCircuitsChronogramsWorkbenchPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "67676767-6767-4767-9767-676767676767",
            code: "ELECTRICAL_MACHINES_ACTUATORS",
            name: "Machines électriques / actionneurs",
            slug: "electrical-machines-actuators",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "68686868-6868-4868-9868-686868686868",
          toolId: "65656565-6565-4565-9565-656565656565",
          title: "أكمل كرونوغرام خرج مؤقت TON",
          goal: "اقرأ دخل المؤقت وزمن الضبط ثم أكمل Q في المجالات الزمنية.",
          preset: electricalCircuitsChronogramsWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells:
              electricalCircuitsChronogramsWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "64646464-6464-4464-9464-646464646464",
            code: "AUTOMATION_GRAFCET_GEMMA",
            name: "Automatisation / GRAFCET / GEMMA",
            slug: "automation-grafcet-gemma",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-electrical-technical-file": {
    tool: playwrightTestLabTools.data[20],
    missions: [
      {
        mission: {
          id: "6a6a6a6a-6a6a-4a6a-9a6a-6a6a6a6a6a6a",
          toolId: "69696969-6969-4969-9969-696969696969",
          title: "عرّف مكونات ملف مشغل محرك",
          goal: "سمّ QF وKM وRT وM ثم أكمل جدول وظيفة كل عنصر.",
          preset: electricalTechnicalFileWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells:
              electricalTechnicalFileWorkbenchPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "67676767-6767-4767-9767-676767676767",
            code: "ELECTRICAL_MACHINES_ACTUATORS",
            name: "Machines électriques / actionneurs",
            slug: "electrical-machines-actuators",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "6b6b6b6b-6b6b-4b6b-9b6b-6b6b6b6b6b6b",
          toolId: "69696969-6969-4969-9969-696969696969",
          title: "احسب تيار محرك واختر عيار الحماية",
          goal: "استغل بطاقة المحرك لحساب I ثم اختر عيار حماية أعلى مباشرة.",
          preset: electricalTechnicalFileWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              electricalTechnicalFileWorkbenchPresets[1].expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "67676767-6767-4767-9767-676767676767",
            code: "ELECTRICAL_MACHINES_ACTUATORS",
            name: "Machines électriques / actionneurs",
            slug: "electrical-machines-actuators",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-mechanical-drawing-workbench": {
    tool: playwrightTestLabTools.data[21],
    missions: [
      {
        mission: {
          id: "71717171-7171-4171-9171-717171717171",
          toolId: "70707070-7070-4070-9070-707070707070",
          title: "اقرأ رسم تجميعي ومدونة قطع",
          goal: "اربط أرقام القطع بالتعيين والمادة ثم اشرح دور المدونة.",
          preset: mechanicalDrawingWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: mechanicalDrawingWorkbenchPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "72727272-7272-4272-9272-727272727272",
            code: "FUNCTIONAL_ANALYSIS",
            name: "Analyse fonctionnelle",
            slug: "functional-analysis",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "73737373-7373-4373-9373-737373737373",
          toolId: "70707070-7070-4070-9070-707070707070",
          title: "أتمم قراءة رسم تعريفي ومقطع",
          goal: "حدد القطر الوظيفي والسماحة والخشونة والمقطع A-A.",
          preset: mechanicalDrawingWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: mechanicalDrawingWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "74747474-7474-4474-9474-747474747474",
            code: "MANUFACTURING_PREPARATION",
            name: "Préparation de fabrication",
            slug: "manufacturing-preparation",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-mechanical-mechanism-kinematics": {
    tool: playwrightTestLabTools.data[22],
    missions: [
      {
        mission: {
          id: "76767676-7676-4676-9676-767676767676",
          toolId: "75757575-7575-4575-9575-757575757575",
          title: "احسب سرعة خرج مخفض تروس",
          goal: "حدد القائد والمقاد ثم احسب n2 ونسبة التخفيض.",
          preset: mechanicalMechanismKinematicsWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              mechanicalMechanismKinematicsWorkbenchPresets[0]
                .expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "77777777-7777-4777-9777-777777777777",
            code: "MOTION_TRANSMISSION_CONVERSION",
            name: "Transmission et transformation de mouvement",
            slug: "motion-transmission-conversion",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "78787878-7878-4878-9878-787878787878",
          toolId: "75757575-7575-4575-9575-757575757575",
          title: "احسب إزاحة جريدة مسننة",
          goal: "ميز تحويل الدوران إلى انتقال ثم احسب إزاحة الجريدة.",
          preset: mechanicalMechanismKinematicsWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              mechanicalMechanismKinematicsWorkbenchPresets[1]
                .expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "77777777-7777-4777-9777-777777777777",
            code: "MOTION_TRANSMISSION_CONVERSION",
            name: "Transmission et transformation de mouvement",
            slug: "motion-transmission-conversion",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-mechanical-manufacturing-tolerances": {
    tool: playwrightTestLabTools.data[23],
    missions: [
      {
        mission: {
          id: "7a7a7a7a-7a7a-4a7a-9a7a-7a7a7a7a7a7a",
          toolId: "79797979-7979-4979-9979-797979797979",
          title: "أكمل ورقة تحضير تصنيع محور",
          goal: "رتب العمليات واختر الآلة والأداة والمراقبة المناسبة.",
          preset: mechanicalManufacturingTolerancesWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells:
              mechanicalManufacturingTolerancesWorkbenchPresets[0]
                .expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "74747474-7474-4474-9474-747474747474",
            code: "MANUFACTURING_PREPARATION",
            name: "Préparation de fabrication",
            slug: "manufacturing-preparation",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "7b7b7b7b-7b7b-4b7b-9b7b-7b7b7b7b7b7b",
          toolId: "79797979-7979-4979-9979-797979797979",
          title: "احسب خلوص ملاءمة H7/g6",
          goal: "استعمل حدود الثقب والعمود لحساب Jmin وJmax ونوع الملاءمة.",
          preset: mechanicalManufacturingTolerancesWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              mechanicalManufacturingTolerancesWorkbenchPresets[1]
                .expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "74747474-7474-4474-9474-747474747474",
            code: "MANUFACTURING_PREPARATION",
            name: "Préparation de fabrication",
            slug: "manufacturing-preparation",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-process-reaction-workbench": {
    tool: playwrightTestLabTools.data[24],
    missions: [
      {
        mission: {
          id: "81818181-8181-4181-9181-818181818181",
          toolId: "80808080-8080-4080-9080-808080808080",
          title: "حلل مخطط أسترة",
          goal: "حدد عائلات المتفاعلات والنواتج والوسيط الحمضي.",
          preset: processReactionWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: processReactionWorkbenchPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "82828282-8282-4282-9282-828282828282",
            code: "OXYGENATED_FUNCTIONS",
            name: "Fonctions oxygénées",
            slug: "oxygenated-functions",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "83838383-8383-4383-9383-838383838383",
          toolId: "80808080-8080-4080-9080-808080808080",
          title: "اقرأ مخطط بلمرة بولي إستر",
          goal: "حدد المونوميرات ونوع البلمرة والناتج الثانوي.",
          preset: processReactionWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells: processReactionWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "84848484-8484-4484-9484-848484848484",
            code: "POLYMERS",
            name: "Polymères",
            slug: "polymers",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-process-material-balance-advancement": {
    tool: playwrightTestLabTools.data[25],
    missions: [
      {
        mission: {
          id: "86868686-8686-4686-9686-868686868686",
          toolId: "85858585-8585-4585-9585-858585858585",
          title: "احسب كمية وكتلة إستر من المردود",
          goal: "استعمل R=60% وn0=0.5 mol لحساب كمية وكتلة الإستر.",
          preset: processMaterialBalanceAdvancementWorkbenchPresets[0],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              processMaterialBalanceAdvancementWorkbenchPresets[0]
                .expectedMeasurements,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "82828282-8282-4282-9282-828282828282",
            code: "OXYGENATED_FUNCTIONS",
            name: "Fonctions oxygénées",
            slug: "oxygenated-functions",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "87878787-8787-4787-9787-878787878787",
          toolId: "85858585-8585-4585-9585-858585858585",
          title: "أكمل جدول تقدم وحدد المتفاعل المحد",
          goal: "املأ الكميات النهائية وحدد H2 كمتفاعل محد.",
          preset: processMaterialBalanceAdvancementWorkbenchPresets[1],
          exitCheck: {
            kind: "FORMULA_VALUE",
            expectedMeasurements:
              processMaterialBalanceAdvancementWorkbenchPresets[1]
                .expectedMeasurements,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "88888888-8888-4888-9888-888888888888",
            code: "CHEMICAL_KINETICS",
            name: "Cinétique chimique",
            slug: "chemical-kinetics",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
  "technology-process-flow-instrumentation": {
    tool: playwrightTestLabTools.data[26],
    missions: [
      {
        mission: {
          id: "8a8a8a8a-8a8a-4a8a-9a8a-8a8a8a8a8a8a",
          toolId: "89898989-8989-4989-9989-898989898989",
          title: "اقرأ مخطط جريان تقطير",
          goal: "سمّ العمود والمكثف والغلاية وتيار التغذية.",
          preset: processFlowInstrumentationWorkbenchPresets[0],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells:
              processFlowInstrumentationWorkbenchPresets[0].expectedCells,
          },
          orderIndex: 1,
          curriculumNode: {
            id: "8b8b8b8b-8b8b-4b8b-9b8b-8b8b8b8b8b8b",
            code: "THERMODYNAMICS",
            name: "Thermodynamique",
            slug: "thermodynamics",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
      {
        mission: {
          id: "8c8c8c8c-8c8c-4c8c-9c8c-8c8c8c8c8c8c",
          toolId: "89898989-8989-4989-9989-898989898989",
          title: "حلل حلقة تحكم في مفاعل",
          goal: "اربط TT وTIC وTV بمتغير الحرارة وماء التبريد.",
          preset: processFlowInstrumentationWorkbenchPresets[1],
          exitCheck: {
            kind: "TABLE_CELLS",
            expectedCells:
              processFlowInstrumentationWorkbenchPresets[1].expectedCells,
          },
          orderIndex: 2,
          curriculumNode: {
            id: "88888888-8888-4888-9888-888888888888",
            code: "CHEMICAL_KINETICS",
            name: "Cinétique chimique",
            slug: "chemical-kinetics",
          },
          learningTarget: null,
          courseLesson: null,
          createdAt: "2026-05-13T08:00:00.000Z",
          updatedAt: "2026-05-13T08:00:00.000Z",
        },
        latestAttempt: null,
        completedAttemptCount: 0,
      },
    ],
  },
};

export const playwrightTestFilters = {
  streams: [
    {
      code: "SE",
      name: "Sciences experimentales",
      isDefault: true,
      subjectCodes: ["MATH", "NATURAL_SCIENCES"],
    },
  ],
  subjects: [
    {
      code: "MATH",
      name: "Mathematics",
      isDefault: true,
      streams: [
        {
          code: "SE",
          name: "Sciences experimentales",
        },
      ],
      streamCodes: ["SE"],
    },
    {
      code: "NATURAL_SCIENCES",
      name: "علوم الطبيعة والحياة",
      isDefault: false,
      streams: [
        {
          code: "SE",
          name: "Sciences experimentales",
        },
      ],
      streamCodes: ["SE"],
    },
  ],
  years: [2025, 2024, 2023],
  topics: [
    {
      code: "ALG",
      name: "Algebra",
      slug: "algebra",
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      streamCodes: ["SE"],
    },
    {
      code: "PROTEINS",
      name: "البروتينات",
      slug: "proteins",
      parentCode: null,
      displayOrder: 2,
      isSelectable: true,
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      streamCodes: ["SE"],
    },
  ],
  sessionTypes: ["NORMAL", "MAKEUP"],
} satisfies FiltersResponse;

export const playwrightTestCatalog = {
  streams: [
    {
      code: "SE",
      name: "Sciences experimentales",
      subjects: [
        {
          code: "MATH",
          name: "Mathematics",
          years: [
            {
              year: 2025,
              sujets: [
                {
                  examId: "exam-1",
                  sujetNumber: 1,
                  label: "Sujet 1",
                  sessionType: "NORMAL",
                  exerciseCount: 4,
                },
              ],
            },
            {
              year: 2024,
              sujets: [
                {
                  examId: "exam-2",
                  sujetNumber: 2,
                  label: "Sujet 2",
                  sessionType: "MAKEUP",
                  exerciseCount: 3,
                },
              ],
            },
          ],
        },
        {
          code: "NATURAL_SCIENCES",
          name: "علوم الطبيعة والحياة",
          years: [
            {
              year: 2025,
              sujets: [
                {
                  examId: "svt-exam-1",
                  sujetNumber: 1,
                  label: "Sujet 1",
                  sessionType: "NORMAL",
                  exerciseCount: 6,
                },
              ],
            },
            {
              year: 2024,
              sujets: [
                {
                  examId: "svt-exam-2",
                  sujetNumber: 1,
                  label: "Sujet 1",
                  sessionType: "NORMAL",
                  exerciseCount: 6,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} satisfies CatalogResponse;

const playwrightTestBillingPlans = [
  {
    code: "PREMIUM_30_DAYS",
    name: "Premium 30",
    description: "A focused month for short revision sprints.",
    currency: "DZD",
    amount: 2500,
    accessType: "FIXED_DAYS",
    durationDays: 30,
    seasonEndsAt: null,
    features: [
      "Unlimited topic drills",
      "Paper simulations",
      "Priority mistake review",
    ],
  },
  {
    code: "PREMIUM_90_DAYS",
    name: "Premium 90",
    description: "The steady semester option for repeated practice.",
    currency: "DZD",
    amount: 6500,
    accessType: "FIXED_DAYS",
    durationDays: 90,
    seasonEndsAt: null,
    features: [
      "Everything in Premium 30",
      "Longer revision window",
      "Best for trimester planning",
    ],
    recommended: true,
  },
  {
    code: "PREMIUM_BAC_SEASON",
    name: "BAC Season",
    description: "Premium access through the final BAC preparation period.",
    currency: "DZD",
    amount: 9000,
    accessType: "SEASON_END",
    durationDays: null,
    seasonEndsAt: "2026-06-30T23:00:00.000Z",
    features: [
      "Full-season access",
      "Simulations until exam month",
      "Designed for final-year students",
    ],
  },
] satisfies BillingPlan[];

export const playwrightTestBillingOverview = {
  provider: "CHARGILY",
  currentAccess: {
    isPremium: false,
    subscriptionStatus: "FREE",
    subscriptionEndsAt: null,
  },
  availablePlans: playwrightTestBillingPlans,
  recentCheckouts: [
    {
      id: "checkout-1",
      provider: "CHARGILY",
      planCode: "PREMIUM_90_DAYS",
      currency: "DZD",
      amount: 6500,
      status: "PENDING",
      locale: "ar",
      providerCheckoutId: "chargily-checkout-1",
      paymentMethod: null,
      checkoutUrl: "https://pay.chargily.test/checkout-1",
      failureReason: null,
      accessStartsAt: null,
      accessEndsAt: null,
      paidAt: null,
      createdAt: "2026-03-28T12:00:00.000Z",
      updatedAt: "2026-03-28T12:00:00.000Z",
    },
  ],
} satisfies BillingOverviewResponse;

export const playwrightTestBillingCheckout = {
  checkout: playwrightTestBillingOverview.recentCheckouts[0],
} satisfies BillingCheckoutResponse;

export const playwrightTestAdminBillingSettings = {
  settings: {
    premium30DaysAmountDzd: 2500,
    premium30DaysDurationDays: 30,
    premium90DaysAmountDzd: 6500,
    premium90DaysDurationDays: 90,
    premiumBacSeasonAmountDzd: 9000,
    configuredBacSeasonEndsAt: null,
    effectiveBacSeasonEndsAt: "2026-06-30T23:00:00.000Z",
    checkoutFeeResponsibility: "MERCHANT",
    persisted: true,
    updatedAt: "2026-03-28T12:00:00.000Z",
    updatedByUserId: "admin-test-user",
    updatedByEmail: "admin@example.com",
  },
  plans: playwrightTestBillingPlans,
} satisfies AdminBillingSettingsResponse;

export const playwrightTestExam = {
  id: "exam-1",
  paperId: "paper-1",
  year: 2025,
  sessionType: "NORMAL",
  durationMinutes: 210,
  officialSourceReference: null,
  stream: {
    code: "SE",
    name: "Sciences experimentales",
  },
  subject: {
    code: "MATH",
    name: "Mathematics",
  },
  selectedSujetNumber: 1,
  selectedSujetLabel: "Sujet 1",
  availableSujets: [
    {
      sujetNumber: 1,
      label: "Sujet 1",
    },
  ],
  selectedVariantCode: "SUJET_1",
  hierarchy: {
    variantId: "variant-1",
    variantCode: "SUJET_1",
    title: "Sujet 1",
    status: "PUBLISHED",
    nodeCount: 5,
    exercises: [
      {
        id: "exercise-1",
        nodeType: "EXERCISE",
        orderIndex: 1,
        label: "Exercise 1",
        maxPoints: 8,
        status: "PUBLISHED",
        metadata: null,
        topics: [{ code: "ALG", name: "Algebra" }],
        blocks: [
          {
            id: "exam-context-1",
            role: "STEM",
            orderIndex: 1,
            blockType: "PARAGRAPH",
            textValue: "Let f be the function defined by f(x) = x^2 - 3x + 2.",
            data: null,
            media: null,
          },
        ],
        children: [
          {
            id: "question-1",
            nodeType: "QUESTION",
            orderIndex: 1,
            label: "1",
            maxPoints: 3,
            status: "PUBLISHED",
            metadata: null,
            topics: [{ code: "ALG", name: "Algebra" }],
            blocks: [
              {
                id: "question-1-prompt",
                role: "PROMPT",
                orderIndex: 1,
                blockType: "PARAGRAPH",
                textValue: "Solve f(x) = 0 and interpret the roots.",
                data: null,
                media: null,
              },
              {
                id: "question-1-solution",
                role: "SOLUTION",
                orderIndex: 2,
                blockType: "PARAGRAPH",
                textValue: "f(x) = (x - 1)(x - 2), so the roots are 1 and 2.",
                data: null,
                media: null,
              },
            ],
            children: [],
          },
          {
            id: "question-2",
            nodeType: "QUESTION",
            orderIndex: 2,
            label: "2",
            maxPoints: 5,
            status: "PUBLISHED",
            metadata: null,
            topics: [{ code: "ALG", name: "Algebra" }],
            blocks: [
              {
                id: "question-2-prompt",
                role: "PROMPT",
                orderIndex: 1,
                blockType: "PARAGRAPH",
                textValue: "Determine the sign of f(x) on R.",
                data: null,
                media: null,
              },
              {
                id: "question-2-solution",
                role: "SOLUTION",
                orderIndex: 2,
                blockType: "PARAGRAPH",
                textValue:
                  "The parabola opens upward, so f is positive outside [1, 2] and negative inside.",
                data: null,
                media: null,
              },
            ],
            children: [],
          },
        ],
      },
      {
        id: "exercise-2",
        nodeType: "EXERCISE",
        orderIndex: 2,
        label: "Exercise 2",
        maxPoints: 6,
        status: "PUBLISHED",
        metadata: null,
        topics: [{ code: "ALG", name: "Algebra" }],
        blocks: [
          {
            id: "exam-context-2",
            role: "STEM",
            orderIndex: 1,
            blockType: "PARAGRAPH",
            textValue:
              "A sequence is defined by u0 = 2 and u(n+1) = 3u(n) - 1.",
            data: null,
            media: null,
          },
        ],
        children: [
          {
            id: "question-3",
            nodeType: "QUESTION",
            orderIndex: 1,
            label: "1",
            maxPoints: 6,
            status: "PUBLISHED",
            metadata: null,
            topics: [{ code: "ALG", name: "Algebra" }],
            blocks: [
              {
                id: "question-3-prompt",
                role: "PROMPT",
                orderIndex: 1,
                blockType: "PARAGRAPH",
                textValue:
                  "Compute u1 and u2, then conjecture the growth trend.",
                data: null,
                media: null,
              },
              {
                id: "question-3-solution",
                role: "SOLUTION",
                orderIndex: 2,
                blockType: "PARAGRAPH",
                textValue: "u1 = 5 and u2 = 14. The terms grow rapidly.",
                data: null,
                media: null,
              },
            ],
            children: [],
          },
        ],
      },
    ],
  },
  exerciseCount: 2,
  exercises: [
    {
      id: "exercise-1",
      orderIndex: 1,
      title: "Exercise 1",
      totalPoints: 8,
      questionCount: 2,
    },
    {
      id: "exercise-2",
      orderIndex: 2,
      title: "Exercise 2",
      totalPoints: 6,
      questionCount: 1,
    },
  ],
} satisfies ExamResponse;

export const playwrightTestPreview = {
  sessionFamily: "DRILL",
  sessionKind: "TOPIC_DRILL",
  subjectCode: "MATH",
  streamCode: "SE",
  streamCodes: ["SE"],
  years: [2025, 2024],
  topicCodes: ["ALG"],
  sessionTypes: ["NORMAL"],
  sourceExamId: null,
  durationMinutes: null,
  matchingExerciseCount: 3,
  matchingSujetCount: 2,
  sampleExercises: [
    {
      examId: "exam-1",
      exerciseNodeId: "exercise-1",
      orderIndex: 1,
      questionCount: 1,
      title: "Exercise 1",
      year: 2025,
      sujetLabel: "Sujet 1",
      sessionType: "NORMAL",
      sujetNumber: 1,
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
    },
  ],
  matchingSujets: [
    {
      examId: "exam-1",
      year: 2025,
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      sessionType: "NORMAL",
      sujetNumber: 1,
      sujetLabel: "Sujet 1",
      matchingExerciseCount: 2,
    },
    {
      examId: "exam-2",
      year: 2024,
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      sessionType: "MAKEUP",
      sujetNumber: 2,
      sujetLabel: "Sujet 2",
      matchingExerciseCount: 1,
    },
  ],
  yearsDistribution: [
    {
      year: 2025,
      matchingExerciseCount: 2,
    },
    {
      year: 2024,
      matchingExerciseCount: 1,
    },
  ],
  streamsDistribution: [
    {
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      matchingExerciseCount: 3,
    },
  ],
  maxSelectableExercises: 12,
} satisfies SessionPreviewResponse;

export const playwrightTestRecentExerciseStates = {
  data: [],
} satisfies RecentExerciseStatesResponse;

export const playwrightTestMyMistakes = {
  data: [],
} satisfies MyMistakesResponse;

export const playwrightTestWeakPointInsights = {
  enabled: false,
  data: [],
} satisfies WeakPointInsightsResponse;

export const playwrightTestCurriculumJourneys = {
  data: [
    {
      id: "curriculum-journey-math",
      title: "Math curriculum journey",
      description: "A guided curriculum journey for mathematics.",
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      curriculum: {
        code: "GENERAL",
        title: "Mathematics",
      },
      totalNodeCount: 3,
      solidNodeCount: 1,
      needsReviewNodeCount: 1,
      inProgressNodeCount: 0,
      notStartedNodeCount: 1,
      openReviewItemCount: 1,
      progressPercent: 42,
      updatedAt: "2026-04-09T10:00:00.000Z",
      nextAction: {
        type: "TOPIC_DRILL",
        label: "Review Algebra",
        curriculumNodeCode: "ALG",
        curriculumNodeName: "Algebra",
        topicCode: "ALG",
        topicName: "Algebra",
      },
      sections: [
        {
          id: "curriculum-journey-section-1",
          code: "FOUNDATION",
          title: "Foundations",
          description: "Stabilize the highest-return chapters first.",
          orderIndex: 1,
          nodes: [
            {
              id: "curriculum-journey-node-1",
              title: "Algebra",
              description: "Start with the chapter that most needs attention.",
              curriculumNodeCode: "ALG",
              curriculumNodeName: "Algebra",
              topicCode: "ALG",
              topicName: "Algebra",
              orderIndex: 1,
              estimatedSessions: 3,
              isOptional: false,
              sectionId: "curriculum-journey-section-1",
              recommendedPreviousNodeId: null,
              recommendedPreviousNodeTitle: null,
              status: "NEEDS_REVIEW",
              progressPercent: 25,
              weaknessScore: 7,
              attemptedQuestions: 5,
              correctCount: 2,
              incorrectCount: 2,
              lastSeenAt: "2026-04-09T10:00:00.000Z",
            },
            {
              id: "curriculum-journey-node-2",
              title: "Geometry",
              description: "Lock in your proofs and visual reasoning.",
              curriculumNodeCode: "GEO",
              curriculumNodeName: "Geometry",
              topicCode: "GEO",
              topicName: "Geometry",
              orderIndex: 2,
              estimatedSessions: 2,
              isOptional: false,
              sectionId: "curriculum-journey-section-1",
              recommendedPreviousNodeId: "curriculum-journey-node-1",
              recommendedPreviousNodeTitle: "Algebra",
              status: "SOLID",
              progressPercent: 100,
              weaknessScore: 1,
              attemptedQuestions: 9,
              correctCount: 8,
              incorrectCount: 1,
              lastSeenAt: "2026-04-01T10:00:00.000Z",
            },
          ],
        },
        {
          id: "curriculum-journey-section-2",
          code: "CONSOLIDATION",
          title: "Consolidation",
          description: "Finish with the chapters you have not opened yet.",
          orderIndex: 2,
          nodes: [
            {
              id: "curriculum-journey-node-3",
              title: "Analysis",
              description: "Build enough momentum here before a full mock.",
              curriculumNodeCode: "ANL",
              curriculumNodeName: "Analysis",
              topicCode: "ANL",
              topicName: "Analysis",
              orderIndex: 3,
              estimatedSessions: 2,
              isOptional: false,
              sectionId: "curriculum-journey-section-2",
              recommendedPreviousNodeId: "curriculum-journey-node-2",
              recommendedPreviousNodeTitle: "Geometry",
              status: "NOT_STARTED",
              progressPercent: 0,
              weaknessScore: 0,
              attemptedQuestions: 0,
              correctCount: 0,
              incorrectCount: 0,
              lastSeenAt: null,
            },
          ],
        },
      ],
      nodes: [
        {
          id: "curriculum-journey-node-1",
          title: "Algebra",
          description: "Start with the chapter that most needs attention.",
          curriculumNodeCode: "ALG",
          curriculumNodeName: "Algebra",
          topicCode: "ALG",
          topicName: "Algebra",
          orderIndex: 1,
          estimatedSessions: 3,
          isOptional: false,
          sectionId: "curriculum-journey-section-1",
          recommendedPreviousNodeId: null,
          recommendedPreviousNodeTitle: null,
          status: "NEEDS_REVIEW",
          progressPercent: 25,
          weaknessScore: 7,
          attemptedQuestions: 5,
          correctCount: 2,
          incorrectCount: 2,
          lastSeenAt: "2026-04-09T10:00:00.000Z",
        },
        {
          id: "curriculum-journey-node-2",
          title: "Geometry",
          description: "Lock in your proofs and visual reasoning.",
          curriculumNodeCode: "GEO",
          curriculumNodeName: "Geometry",
          topicCode: "GEO",
          topicName: "Geometry",
          orderIndex: 2,
          estimatedSessions: 2,
          isOptional: false,
          sectionId: "curriculum-journey-section-1",
          recommendedPreviousNodeId: "curriculum-journey-node-1",
          recommendedPreviousNodeTitle: "Algebra",
          status: "SOLID",
          progressPercent: 100,
          weaknessScore: 1,
          attemptedQuestions: 9,
          correctCount: 8,
          incorrectCount: 1,
          lastSeenAt: "2026-04-01T10:00:00.000Z",
        },
        {
          id: "curriculum-journey-node-3",
          title: "Analysis",
          description: "Build enough momentum here before a full mock.",
          curriculumNodeCode: "ANL",
          curriculumNodeName: "Analysis",
          topicCode: "ANL",
          topicName: "Analysis",
          orderIndex: 3,
          estimatedSessions: 2,
          isOptional: false,
          sectionId: "curriculum-journey-section-2",
          recommendedPreviousNodeId: "curriculum-journey-node-2",
          recommendedPreviousNodeTitle: "Geometry",
          status: "NOT_STARTED",
          progressPercent: 0,
          weaknessScore: 0,
          attemptedQuestions: 0,
          correctCount: 0,
          incorrectCount: 0,
          lastSeenAt: null,
        },
      ],
    },
  ],
} satisfies CurriculumJourneysResponse;

export const playwrightTestCourseSubjectCards = {
  data: [
    {
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      title: "Mathematics",
      description: "A guided curriculum journey for mathematics.",
      progressPercent: 42,
      unitCount: 2,
      topicCount: 3,
      completedTopicCount: 1,
      continueTopicCode: "ALG",
    },
  ],
} satisfies CourseSubjectCardsResponse;

export const playwrightTestCourseSubject = {
  subject: {
    code: "MATH",
    name: "Mathematics",
  },
  title: "Math curriculum journey",
  description: "A guided curriculum journey for mathematics.",
  progressPercent: 42,
  topicCount: 3,
  completedTopicCount: 1,
  continueTopicCode: "ALG",
  units: [
    {
      id: "curriculum-journey-section-1",
      code: "FOUNDATION",
      title: "Foundations",
      description: "Stabilize the highest-return chapters first.",
      progressPercent: 63,
      topics: [
        {
          topicCode: "ALG",
          slug: "algebra",
          title: "Algebra",
          shortTitle: "Algebra",
          description: "Start with the chapter that most needs attention.",
          status: "NEEDS_REVIEW",
          progressPercent: 25,
          conceptCount: 1,
        },
        {
          topicCode: "GEO",
          slug: "geometry",
          title: "Geometry",
          shortTitle: "Geometry",
          description: "Lock in your proofs and visual reasoning.",
          status: "COMPLETED",
          progressPercent: 100,
          conceptCount: 1,
        },
      ],
    },
    {
      id: "curriculum-journey-section-2",
      code: "CONSOLIDATION",
      title: "Consolidation",
      description: "Finish with the chapters you have not opened yet.",
      progressPercent: 0,
      topics: [
        {
          topicCode: "ANL",
          slug: "analysis",
          title: "Analysis",
          shortTitle: "Analysis",
          description: "Build enough momentum here before a full mock.",
          status: "READY",
          progressPercent: 0,
          conceptCount: 1,
        },
      ],
    },
  ],
} satisfies CourseSubjectResponse;

export const playwrightTestCourseTopic = {
  subject: {
    code: "MATH",
    name: "Mathematics",
  },
  topic: {
    code: "ALG",
    slug: "algebra",
    title: "Algebra",
    shortTitle: "Algebra",
  },
  parentUnitTitle: "Foundations",
  description: "Start with the chapter that most needs attention.",
  progressPercent: 25,
  status: "NEEDS_REVIEW",
  concepts: [
    {
      conceptCode: "ALG",
      slug: "algebra",
      unitCode: null,
      role: "LESSON",
      title: "Algebra",
      description: null,
    },
  ],
} satisfies CourseTopicResponse;

export const playwrightTestCourseConcept = {
  subject: {
    code: "MATH",
    name: "Mathematics",
  },
  topic: {
    code: "ALG",
    slug: "algebra",
    title: "Algebra",
    shortTitle: "Algebra",
  },
  concept: {
    conceptCode: "ALG",
    slug: "algebra",
    unitCode: null,
    role: "LESSON",
    title: "Core algebra checkpoint",
    summary: "Stabilize the symbolic move before drilling exam questions.",
    estimatedMinutes: 4,
  },
  navigation: {
    previousConceptSlug: null,
    nextConceptSlug: null,
  },
  steps: [
    {
      id: "rule",
      type: "RULE",
      eyebrow: "Rule",
      title: "Keep both sides balanced",
      body: "Every algebraic transformation must preserve equality on both sides.",
      bullets: ["Apply the same operation to both sides"],
      visual: null,
      interaction: null,
      examLens: null,
    },
  ],
  depthPortals: [],
  quiz: {
    question: "What must stay true after an algebraic transformation?",
    options: ["The equality is preserved", "The left side becomes larger"],
    correctIndex: 0,
    explanation: "Balanced transformations keep the equation equivalent.",
  },
} satisfies CourseConceptResponse;

export const playwrightTestStudySession = {
  id: "session-123",
  title: "Focused training",
  family: "DRILL",
  kind: "TOPIC_DRILL",
  status: "IN_PROGRESS",
  sourceExamId: null,
  requestedExerciseCount: 3,
  exerciseCount: 1,
  durationMinutes: null,
  timingEnabled: false,
  filters: {
    years: [2025, 2024],
    streamCodes: ["SE"],
    subjectCode: "MATH",
    topicCodes: ["ALG"],
    sessionTypes: ["NORMAL"],
  },
  progress: null,
  pedagogy: {
    supportStyle: "LOGIC_HEAVY",
    weakPointIntro: null,
  },
  startedAt: "2026-03-28T12:00:00.000Z",
  deadlineAt: null,
  submittedAt: null,
  completedAt: null,
  lastInteractedAt: "2026-03-28T12:00:00.000Z",
  createdAt: "2026-03-28T12:00:00.000Z",
  updatedAt: "2026-03-28T12:00:00.000Z",
  exercises: [
    {
      sessionOrder: 1,
      id: "exercise-1",
      orderIndex: 1,
      title: "Exercise 1",
      totalPoints: 8,
      questionCount: 1,
      hierarchy: {
        exerciseNodeId: "exercise-1",
        exerciseLabel: "Exercise 1",
        contextBlocks: [],
        questions: [
          {
            id: "q1",
            orderIndex: 1,
            label: "Q1",
            points: 8,
            depth: 0,
            interaction: {
              format: "PROBLEM_SOLVING",
              captureMode: "TYPELESS",
              responseMode: "NONE",
              checkStrategy: "RESULT_MATCH",
            },
            topics: [{ code: "ALG", name: "Algebra" }],
            promptBlocks: [
              {
                id: "prompt-1",
                role: "PROMPT",
                orderIndex: 1,
                blockType: "PARAGRAPH",
                textValue: "Solve x + 1 = 2",
                data: null,
                media: null,
              },
            ],
            solutionBlocks: [
              {
                id: "solution-1",
                role: "SOLUTION",
                orderIndex: 1,
                blockType: "PARAGRAPH",
                textValue: "x = 1",
                data: null,
                media: null,
              },
            ],
            hintBlocks: [],
            rubricBlocks: [],
          },
        ],
      },
      exam: {
        year: 2025,
        sessionType: "NORMAL",
        subject: {
          code: "MATH",
          name: "Mathematics",
        },
        stream: {
          code: "SE",
          name: "Sciences experimentales",
        },
      },
    },
  ],
} satisfies StudySessionResponse;

export const playwrightTestAdminJobSummary = {
  id: "job-1",
  label: "BAC 2025 · MATHEMATICS · SE",
  draft_kind: "ingestion",
  provider: "manual_upload",
  year: 2025,
  stream_codes: ["SE"],
  subject_code: "MATHEMATICS",
  session: "normal",
  min_year: 2025,
  status: "draft",
  source_document_count: 2,
  source_page_count: 6,
  workflow: {
    has_exam_document: true,
    has_correction_document: true,
    awaiting_correction: false,
    can_process: true,
    review_started: false,
    active_operation: "idle",
  },
  published_paper_id: null,
  published_exams: [],
  created_at: "2026-03-28T12:00:00.000Z",
  updated_at: "2026-03-28T12:00:00.000Z",
} satisfies AdminIngestionJobSummary;

export const playwrightTestAdminJobResponse = {
  job: {
    id: "job-1",
    label: "BAC 2025 · MATHEMATICS · SE",
    draft_kind: "ingestion",
    provider: "manual_upload",
    year: 2025,
    stream_codes: ["SE"],
    subject_code: "MATHEMATICS",
    session: "normal",
    min_year: 2025,
    status: "draft",
    review_notes: null,
    error_message: null,
    published_paper_id: null,
    published_exams: [],
    created_at: "2026-03-28T12:00:00.000Z",
    updated_at: "2026-03-28T12:00:00.000Z",
  },
  workflow: playwrightTestAdminJobSummary.workflow,
  documents: [
    {
      id: "doc-exam",
      kind: "exam",
      file_name: "exam.pdf",
      mime_type: "application/pdf",
      page_count: 3,
      sha256: null,
      source_url: null,
      storage_key: "exam.pdf",
      download_url: "/api/v1/ingestion/documents/doc-exam/file",
      pages: [
        {
          id: "page-1",
          page_number: 1,
          width: 1200,
          height: 1600,
          image_url: "/api/v1/ingestion/pages/page-1/image",
        },
      ],
    },
    {
      id: "doc-correction",
      kind: "correction",
      file_name: "correction.pdf",
      mime_type: "application/pdf",
      page_count: 3,
      sha256: null,
      source_url: null,
      storage_key: "correction.pdf",
      download_url: "/api/v1/ingestion/documents/doc-correction/file",
      pages: [],
    },
  ],
  draft_json: {
    schema: "bac_ingestion_draft/v1",
    exam: {
      year: 2025,
      streamCode: "SE",
      subjectCode: "MATHEMATICS",
      sessionType: "NORMAL",
      provider: "manual_upload",
      title: "BAC 2025 · MATHEMATICS · SE",
      minYear: 2025,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: "doc-exam",
      correctionDocumentId: "doc-correction",
      examDocumentStorageKey: "exam.pdf",
      correctionDocumentStorageKey: "correction.pdf",
      metadata: {},
    },
    sourcePages: [],
    assets: [
      {
        id: "asset-table",
        sourcePageId: "page-1",
        documentKind: "EXAM",
        pageNumber: 1,
        variantCode: "SUJET_1",
        role: "PROMPT",
        classification: "table",
        cropBox: {
          x: 10,
          y: 20,
          width: 400,
          height: 180,
        },
        label: "جدول المعاينة",
        notes: null,
      },
    ],
    variants: [
      {
        code: "SUJET_1",
        title: "الموضوع الأول",
        nodes: [
          {
            id: "pw-exercise-1",
            nodeType: "EXERCISE",
            parentId: null,
            orderIndex: 1,
            label: "التمرين الأول",
            maxPoints: null,
            topicCodes: [],
            blocks: [
              {
                id: "pw-exercise-context",
                role: "PROMPT",
                type: "paragraph",
                value: "نص تمهيدي قصير لمعاينة المسودة.",
                assetId: null,
                data: null,
              },
              {
                id: "pw-exercise-table",
                role: "PROMPT",
                type: "table",
                value: "",
                assetId: "asset-table",
                data: null,
              },
            ],
          },
          {
            id: "pw-question-1",
            nodeType: "QUESTION",
            parentId: "pw-exercise-1",
            orderIndex: 1,
            label: "السؤال 1",
            maxPoints: 2,
            topicCodes: [],
            blocks: [
              {
                id: "pw-question-prompt",
                role: "PROMPT",
                type: "paragraph",
                value: "استخرج المعلومة الأساسية من النص.",
                assetId: null,
                data: null,
              },
              {
                id: "pw-question-solution",
                role: "SOLUTION",
                type: "paragraph",
                value: "المعلومة الأساسية واردة بوضوح في النص.",
                assetId: null,
                data: null,
              },
              {
                id: "pw-question-rubric",
                role: "RUBRIC",
                type: "paragraph",
                value: "تمنح نقطتان عند استخراج المعلومة وتبريرها.",
                assetId: null,
                data: null,
              },
            ],
          },
        ],
      },
    ],
  },
  asset_preview_base_url: "/api/v1/ingestion/jobs/job-1/assets",
  validation: {
    errors: [],
    warnings: [],
    issues: [],
    can_approve: false,
    can_publish: false,
  },
} satisfies AdminIngestionJobResponse;

export const playwrightTestAdminCropQueueResponse = {
  summary: {
    job_count: 1,
    placeholder_count: 1,
  },
  data: [
    {
      job_id: "job-1",
      job_label: "BAC 2025 · MATHEMATICS · SE",
      job_status: "in_review",
      draft_kind: "ingestion",
      year: 2025,
      subject_code: "MATHEMATICS",
      stream_codes: ["SE"],
      asset_id: "asset-table",
      asset_label: "جدول المعاينة",
      classification: "table",
      role: "PROMPT",
      variant_code: "SUJET_1",
      source_page_id: "page-1",
      source_document_kind: "EXAM",
      source_page_number: 1,
      source_page_width: 1200,
      source_page_height: 1600,
      page_image_url: "/api/v1/ingestion/pages/page-1/image",
      asset_preview_url:
        "/api/v1/ingestion/jobs/job-1/assets/asset-table/preview",
      crop_box: {
        x: 0,
        y: 0,
        width: 1200,
        height: 1600,
      },
      placeholder: true,
      needs_cleanup: false,
      cleanup_mask_count: 0,
      notes: null,
      linked_node_id: "pw-exercise-1",
      linked_node_path: ["التمرين الأول"],
      updated_at: "2026-03-28T12:00:00.000Z",
    },
  ],
} satisfies AdminIngestionCropQueueResponse;

export function clonePlaywrightFixture<T>(value: T): T {
  return structuredClone(value);
}
