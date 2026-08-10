import { describe, it, expect } from 'vitest';
import { AnalyticsService } from '../services/analytics';

describe('TalentIQ Analytics Match Score', () => {
  it('should calculate accurate skill match percentages', async () => {
    const analytics = new AnalyticsService();
    const candidateSkills = ['TypeScript', 'Node.js', 'React', 'Docker'];
    const jobRequirements = ['TypeScript', 'Node.js', 'Kubernetes'];

    const score = await analytics.calculateMatchScore(candidateSkills, jobRequirements);
    expect(score).toBe(67); // 2 out of 3 matches
  });
});
