import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CatalogModule } from './catalog/catalog.module';
import { CoursesModule } from './courses/courses.module';
import { FlashcardsModule } from './flashcards/flashcards.module';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { LabModule } from './lab/lab.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SourceWorkbenchModule } from './source-workbench/source-workbench.module';
import { StudyModule } from './study/study.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    RedisModule,
    PrismaModule,
    CatalogModule,
    AuthModule,
    BillingModule,
    CoursesModule,
    FlashcardsModule,
    LabModule,
    HealthModule,
    StudyModule,
    AdminModule,
    IngestionModule,
    SourceWorkbenchModule,
  ],
})
export class AppModule {}
