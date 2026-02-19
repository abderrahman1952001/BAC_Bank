import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      service: 'bac-bank-api',
      timestamp: new Date().toISOString(),
    };
  }
}
