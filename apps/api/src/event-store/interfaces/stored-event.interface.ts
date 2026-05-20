export interface StoredEvent {
    id: string;
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    eventVersion: number;
    payload: Record<string, unknown>;
    metadata: EventMetadata;
    occurredAt: Date;
}

export interface EventMetadata {
    correlationId: string;
    causationId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface EventEnvelope<T = Record<string, unknown>> {
    eventId: string;
    aggregateId: string;
    aggregateType: AggregateType;
    eventType: string;
    eventVersion: number;
    payload: T;
    metadata: EventMetadata;
    occurredAt: string; // ISO 8601
}

export enum AggregateType {
    CANDIDATE = 'Candidate',
    JOB = 'Job',
    INTERVIEW = 'Interview',
    APPLICATION = 'Application',
    CREDENTIAL = 'Credential',
    ORGANIZATION = 'Organization',
}
