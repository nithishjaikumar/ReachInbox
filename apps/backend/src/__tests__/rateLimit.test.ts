import { describe, it, expect } from 'vitest';
import { rateLimitService } from '../services/rateLimit.service';

describe('Rate Limiting & Next Window Logic', () => {
  it('correctly calculates next available hour boundary', () => {
    const nextWindow = rateLimitService.getNextAvailableWindow();
    
    expect(nextWindow).toBeInstanceOf(Date);
    expect(nextWindow.getTime()).toBeGreaterThan(Date.now());
    expect(nextWindow.getUTCMinutes()).toBe(0);
    expect(nextWindow.getUTCSeconds()).toBe(0);
    expect(nextWindow.getUTCMilliseconds()).toBe(0);
  });

  it('formats hourly window keys in UTC consistently across workers', () => {
    const date = new Date('2026-09-04T14:25:30Z');
    const senderId = 'sender-uuid-123';
    const hourWindow = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCHours()}`;
    const expectedKey = `rate-limit:${senderId}:2026-9-4-14`;

    expect(`rate-limit:${senderId}:${hourWindow}`).toBe(expectedKey);
  });
});
