export class AnalyticsService {
  async calculateMatchScore(candidateSkills: string[], jobRequirements: string[]): Promise<number> {
    if (jobRequirements.length === 0) return 100;
    const matches = candidateSkills.filter(skill => jobRequirements.includes(skill));
    return Math.round((matches.length / jobRequirements.length) * 100);
  }
}
