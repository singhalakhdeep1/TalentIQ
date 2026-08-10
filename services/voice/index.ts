export class VoiceInterviewService {
  async processAudioChunk(audioBuffer: Buffer): Promise<{ transcript: string; sentimentScore: number }> {
    return {
      transcript: 'Candidate responded clearly regarding technical leadership experience.',
      sentimentScore: 0.85,
    };
  }
}
