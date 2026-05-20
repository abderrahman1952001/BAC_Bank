import { Injectable } from '@nestjs/common';
import type {
  StudyCommandAcceptResponse,
  StudyCommandDiagnosticsResponse,
  StudyCommandHistoryResponse,
  StudyCommandProposal,
  StudyCommandProposalResponse,
  StudyCommandStartersResponse,
} from '@bac-bank/contracts/study-command';
import { FlashcardsService } from '../flashcards/flashcards.service';
import { LabService } from '../lab/lab.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudyCurriculumJourneyService } from './study-curriculum-journey.service';
import {
  StudyCommandAiRouterService,
  type StudyCommandAiRouterResult,
} from './study-command-ai-router.service';
import {
  buildStudyCommandProposal,
  buildStudyCommandStarters,
  markStudyCommandProposalReady,
  markStudyCommandProposalUnavailable,
  markStudyCommandProposalNeedsContent,
  type StudyCommandContext,
} from './study-command-engine';
import { StudyCommandBrainService } from './study-command-brain.service';
import { StudyReviewService } from './study-review.service';
import { StudyService } from './study.service';
import { StudyWeakPointService } from './study-weak-point.service';

const UNAVAILABLE_PREVIEW_MESSAGE =
  'لم نستطع تأكيد توفر تمارين مطابقة بهذا الربط الآن. افتح إعداد الجلسة واختر المادة أو المحور يدوياً.';
const NO_PROPOSAL_MESSAGE =
  'اكتب ما تريد دراسته الآن حتى نحوله إلى جلسة واضحة.';

function buildStudentTrainingSessionRoute(sessionId: string) {
  return `/student/training/${encodeURIComponent(sessionId)}`;
}

type StudyCommandProposalBuild = {
  proposal: StudyCommandProposal | null;
  aiRouterResult: StudyCommandAiRouterResult | null;
};

@Injectable()
export class StudyCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studyService: StudyService,
    private readonly studyReviewService: StudyReviewService,
    private readonly studyCurriculumJourneyService: StudyCurriculumJourneyService,
    private readonly studyWeakPointService: StudyWeakPointService,
    private readonly flashcardsService: FlashcardsService,
    private readonly labService: LabService,
    private readonly studyCommandAiRouterService: StudyCommandAiRouterService,
    private readonly studyCommandBrainService: StudyCommandBrainService,
  ) {}

  async listStarters(userId: string): Promise<StudyCommandStartersResponse> {
    const context = await this.buildContext(userId);

    return {
      data: buildStudyCommandStarters(context),
    };
  }

  async propose(
    userId: string,
    command: string,
  ): Promise<StudyCommandProposalResponse> {
    const result = await this.buildProposalForCommand(userId, command);

    await this.studyCommandBrainService.recordEvent({
      userId,
      command,
      proposal: result.proposal,
      aiRouterResult: result.aiRouterResult,
      kind: 'PROPOSED',
      resultKind: null,
      sourceId: null,
    });

    return {
      proposal: result.proposal,
    };
  }

  async accept(
    userId: string,
    command: string,
  ): Promise<StudyCommandAcceptResponse> {
    const result = await this.buildProposalForCommand(userId, command);
    const proposal = result.proposal;

    if (!proposal) {
      const response = {
        kind: 'NO_PROPOSAL',
        message: NO_PROPOSAL_MESSAGE,
      } satisfies StudyCommandAcceptResponse;

      await this.studyCommandBrainService.recordEvent({
        userId,
        command,
        proposal,
        aiRouterResult: result.aiRouterResult,
        kind: 'ACCEPTED',
        resultKind: response.kind,
        sourceId: null,
      });

      return response;
    }

    if (proposal.primaryAction.kind === 'OPEN_ROUTE') {
      const response = {
        kind: 'OPEN_ROUTE',
        href: proposal.primaryAction.href,
        proposal,
        message: proposal.availability?.message,
      } satisfies StudyCommandAcceptResponse;

      await this.studyCommandBrainService.recordEvent({
        userId,
        command,
        proposal,
        aiRouterResult: result.aiRouterResult,
        kind: 'ACCEPTED',
        resultKind: response.kind,
        sourceId: null,
      });

      return response;
    }

    const created = await this.studyService.createStudySession(
      userId,
      proposal.primaryAction.request,
    );
    const href = buildStudentTrainingSessionRoute(created.id);

    const response = {
      kind: 'CREATED_STUDY_SESSION',
      sessionId: created.id,
      href,
      proposal,
    } satisfies StudyCommandAcceptResponse;

    await this.studyCommandBrainService.recordEvent({
      userId,
      command,
      proposal,
      aiRouterResult: result.aiRouterResult,
      kind: 'ACCEPTED',
      resultKind: response.kind,
      sourceId: created.id,
    });

    return response;
  }

  async listHistory(userId: string): Promise<StudyCommandHistoryResponse> {
    return this.studyCommandBrainService.listHistory(userId);
  }

  async getDiagnostics(): Promise<StudyCommandDiagnosticsResponse> {
    return this.studyCommandBrainService.getDiagnostics();
  }

  private async buildProposalForCommand(
    userId: string,
    command: string,
  ): Promise<StudyCommandProposalBuild> {
    const context = await this.buildContext(userId);
    const aiRouterResult = await this.safe(
      this.studyCommandAiRouterService.interpret({
        userId,
        command,
        context,
      }),
      null,
    );
    const proposal = buildStudyCommandProposal(
      command,
      context,
      aiRouterResult?.interpretation ?? null,
    );

    return {
      proposal: proposal
        ? await this.resolveProposalAvailability(userId, proposal)
        : null,
      aiRouterResult,
    };
  }

  private async resolveProposalAvailability(
    userId: string,
    proposal: StudyCommandProposal,
  ): Promise<StudyCommandProposal> {
    if (proposal.primaryAction.kind !== 'CREATE_STUDY_SESSION') {
      return proposal;
    }

    const preview = await this.safe(
      this.studyService.previewStudySession(
        userId,
        proposal.primaryAction.request,
      ),
      null,
    );

    if (!preview) {
      return markStudyCommandProposalUnavailable(
        proposal,
        UNAVAILABLE_PREVIEW_MESSAGE,
      );
    }

    if (preview.matchingExerciseCount <= 0) {
      return markStudyCommandProposalNeedsContent(proposal);
    }

    return markStudyCommandProposalReady(
      proposal,
      preview.matchingExerciseCount,
    );
  }

  private async buildContext(userId: string): Promise<StudyCommandContext> {
    const [
      sessions,
      recentExamActivities,
      myMistakes,
      curriculumJourneys,
      weakPointInsights,
      dueFlashcards,
      labTools,
      filters,
      catalog,
      userStreamCode,
    ] = await Promise.all([
      this.safe(
        this.studyService
          .listRecentStudySessions(userId, 6)
          .then((payload) => payload.data),
        [],
      ),
      this.safe(
        this.studyService
          .listRecentExamActivities(userId, 6)
          .then((payload) => payload.data),
        [],
      ),
      this.safe(
        this.studyReviewService
          .listMyMistakes(userId, { limit: 6 })
          .then((payload) => payload.data),
        [],
      ),
      this.safe(
        this.studyCurriculumJourneyService
          .listCurriculumJourneys(userId, { limit: 4 })
          .then((payload) => payload.data),
        [],
      ),
      this.safe(
        this.studyWeakPointService
          .listWeakPointInsights(userId, { limit: 4 })
          .then((payload) => payload.data),
        [],
      ),
      this.safe(
        this.flashcardsService
          .listDueCards(userId, { limit: 6 })
          .then((payload) => payload.data),
        [],
      ),
      this.safe(
        this.labService.listTools(userId).then((payload) => payload.data),
        [],
      ),
      this.safe(this.studyService.getFilters(), null),
      this.safe(this.studyService.getCatalog(), null),
      this.resolveUserStreamCode(userId),
    ]);

    return {
      sessions,
      recentExamActivities,
      myMistakes,
      curriculumJourneys,
      weakPointInsights,
      dueFlashcards,
      labTools,
      filters,
      catalog,
      userStreamCode,
    };
  }

  private async resolveUserStreamCode(userId: string) {
    const user = await this.safe(
      this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          stream: {
            select: {
              code: true,
            },
          },
        },
      }),
      null,
    );

    return user?.stream?.code ?? null;
  }

  private async safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  }
}
