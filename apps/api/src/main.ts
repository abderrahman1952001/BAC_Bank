import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { configureApiApp, createApiAdapter } from './app-setup';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createApiAdapter(),
  );
  await configureApiApp(app);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
