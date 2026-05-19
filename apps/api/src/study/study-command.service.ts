import { Injectable } from '@nestjs/common';
import type {
  StudyCommandProposal,
  StudyCommandProposalResponse,
  StudyCommandStartersResponse,
} from '@bac-bank/contracts/study-command';
import { FlashcardsService } from '../flashcards/flashcards.service';
import { LabService } from '../lab/lab.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudyCurriculumJourneyService } from './study-curriculum-journey.service';
import {
  buildStudyCommandProposal,
  buildStudyCommandStarters,
  markStudyCommandProposalReady,
  markStudyCommandProposalUnavailable,
  markStudyCommandProposalNeedsContent,
  type StudyCommandContext,
} from './study-command-engine';
import { StudyReviewService } from './study-review.service';
import { StudyService } from './study.service';
import { StudyWeakPointService } from './study-weak-point.service';

const UNAVAILABLE_PREVIEW_MESSAGE =
  'لم نستطع تأكيد توفر تمارين مطابقة بهذا الربط الآن. افتح إعداد الجلسة واختر المادة أو المحور يدوياً.';

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
    const context = await this.buildContext(userId);
    const proposal = buildStudyCommandProposal(command, context);

    return {
      proposal: proposal
        ? await this.resolveProposalAvailability(userId, proposal)
        : null,
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
