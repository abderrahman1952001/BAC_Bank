import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns healthy status payload', () => {
    const controller = new HealthController();
    const response = controller.healthCheck();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('bac-bank-api');
    expect(new Date(response.timestamp).toString()).not.toBe('Invalid Date');
  });
});
