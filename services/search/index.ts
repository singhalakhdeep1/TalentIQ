export class TalentSearchService {
  async semanticSearch(query: string) {
    return [
      { candidateId: 'cand-101', name: 'Alice Smith', score: 0.94 },
      { candidateId: 'cand-102', name: 'Bob Johnson', score: 0.88 },
    ];
  }
}
