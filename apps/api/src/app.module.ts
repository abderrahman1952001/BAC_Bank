import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CatalogBootstrapService } from './catalog/catalog-bootstrap.service';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { PrismaModule } from './prisma/prisma.module';
import { QbankModule } from './qbank/qbank.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    RedisModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    QbankModule,
    AdminModule,
    IngestionModule,
  ],
  providers: [CatalogBootstrapService],
})
export class AppModule {}
