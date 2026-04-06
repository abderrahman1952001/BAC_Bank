import { Module } from '@nestjs/common';
import { QbankController } from './qbank.controller';
import { QbankExamActivityService } from './qbank-exam-activity.service';
import { QbankPracticeSessionService } from './qbank-practice-session.service';
import { QbankService } from './qbank.service';

@Module({
  controllers: [QbankController],
  providers: [QbankService, QbankPracticeSessionService, QbankExamActivityService],
})
export class QbankModule {}
