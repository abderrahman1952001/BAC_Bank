import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IngestionWorkerService } from './ingestion/ingestion-worker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const worker = app.get(IngestionWorkerService);

  const requestShutdown = () => {
    worker.requestStop();
  };

  process.on('SIGINT', () => {
    requestShutdown();
  });
  process.on('SIGTERM', () => {
    requestShutdown();
  });

  await worker.run();
  await app.close();
}

void bootstrap();
