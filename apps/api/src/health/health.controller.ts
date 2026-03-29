import { Controller, Get, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async healthCheck(@Res({ passthrough: true }) response: FastifyReply) {
    const readiness = await this.healthService.getReadiness();
    response.code(readiness.status === 'ok' ? 200 : 503);
    return readiness;
  }

  @Get('live')
  liveCheck() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  async readyCheck(@Res({ passthrough: true }) response: FastifyReply) {
    const readiness = await this.healthService.getReadiness();
    response.code(readiness.status === 'ok' ? 200 : 503);
    return readiness;
  }
}
