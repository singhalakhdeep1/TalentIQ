export interface DomainEvent<TPayload = Record<string, unknown>> {
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    payload: TPayload;
    occurredAt: string;
    metadata?: {
        correlationId?: string;
        causationId?: string;
        actorId?: string;
    };
}

export interface CandidateCreatedPayload {
    candidateId: string;
    email: string;
    fullName: string;
}

export interface ResumeSubmittedPayload {
    candidateId: string;
    storageKey: string;
    fileName: string;
}
