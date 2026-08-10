export interface CandidateResumePayload {
  candidateId: string;
  rawText: string;
  fileFormat: 'pdf' | 'docx' | 'txt';
}

export class IngestionService {
  async processResume(payload: CandidateResumePayload) {
    console.log(`Ingesting candidate resume [${payload.candidateId}]...`);
    return {
      success: true,
      extractedSkills: ['TypeScript', 'Node.js', 'React', 'GraphQL'],
      experienceYears: 5,
    };
  }
}
