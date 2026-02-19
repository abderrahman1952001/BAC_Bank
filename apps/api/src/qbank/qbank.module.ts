import { Module } from '@nestjs/common';
import { QbankController } from './qbank.controller';
import { QbankService } from './qbank.service';

@Module({
  controllers: [QbankController],
  providers: [QbankService],
})
export class QbankModule {}
