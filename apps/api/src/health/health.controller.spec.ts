import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('returns liveness payload', () => {
    const healthService = {
      getLiveness: jest.fn(() => ({
        status: 'ok' as const,
        service: 'bac-bank-api' as const,
        timestamp: '2026-03-28T12:00:00.000Z',
      })),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);
    const response = controller.liveCheck();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('bac-bank-api');
    expect(new Date(response.timestamp).toString()).not.toBe('Invalid Date');
  });
});
