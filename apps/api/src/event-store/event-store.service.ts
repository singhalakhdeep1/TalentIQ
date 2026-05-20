import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoredEvent, EventEnvelope, AggregateType } from './interfaces/stored-event.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * PostgreSQL-backed Event Store
 *
 * All domain state changes are persisted as immutable append-only events.
 * This enables:
 * - Full audit trail of every change
 * - Temporal queries ("what was the state at time T?")
 * - Event replay to rebuild projections
 * - Event sourcing for distributed consistency
 */
@Injectable()
export class EventStoreService {
    private readonly logger = new Logger(EventStoreService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Append a new event to the event store.
     * Optimistic concurrency: throws if expectedVersion mismatch.
     */
    async append<T extends Record<string, unknown>>(
        aggregateId: string,
        aggregateType: AggregateType,
        eventType: string,
        payload: T,
        metadata: Partial<StoredEvent['metadata']> & { correlationId?: string },
        expectedVersion?: number,
    ): Promise<StoredEvent> {
        const currentVersion = await this.getCurrentVersion(aggregateId);

        if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
            throw new Error(
                `Optimistic concurrency conflict: expected version ${expectedVersion}, got ${currentVersion} for aggregate ${aggregateId}`,
            );
        }

        const event = await this.prisma.domainEvent.create({
            data: {
                id: uuidv4(),
                aggregateId,
                aggregateType,
                eventType,
                eventVersion: currentVersion + 1,
                payload: payload as object,
                metadata: {
                    correlationId: metadata.correlationId ?? uuidv4(),
                    causationId: metadata.causationId,
                    userId: metadata.userId,
                    ipAddress: metadata.ipAddress,
                } as object,
                occurredAt: new Date(),
            },
        });

        this.logger.debug(`Event appended: ${eventType} (v${event.eventVersion}) for ${aggregateType}:${aggregateId}`);
        return event as StoredEvent;
    }

    /**
     * Load all events for a given aggregate, in order.
     * Used to rebuild aggregate state from scratch.
     */
    async loadEvents(aggregateId: string, fromVersion?: number): Promise<StoredEvent[]> {
        const events = await this.prisma.domainEvent.findMany({
            where: {
                aggregateId,
                ...(fromVersion !== undefined ? { eventVersion: { gte: fromVersion } } : {}),
            },
            orderBy: { eventVersion: 'asc' },
        });
        return events as StoredEvent[];
    }

    /**
     * Load events by type across all aggregates (for projection rebuilding).
     */
    async loadEventsByType(eventType: string, since?: Date): Promise<StoredEvent[]> {
        return this.prisma.domainEvent.findMany({
            where: {
                eventType,
                ...(since ? { occurredAt: { gte: since } } : {}),
            },
            orderBy: { occurredAt: 'asc' },
        }) as unknown as StoredEvent[];
    }

    /**
     * Load events for a specific aggregate type (for full projection rebuild).
     */
    async loadEventsByAggregateType(
        aggregateType: AggregateType,
        since?: Date,
    ): Promise<StoredEvent[]> {
        return this.prisma.domainEvent.findMany({
            where: {
                aggregateType,
                ...(since ? { occurredAt: { gte: since } } : {}),
            },
            orderBy: { occurredAt: 'asc' },
        }) as unknown as StoredEvent[];
    }

    /**
     * Get current version of an aggregate (highest event version stored).
     */
    async getCurrentVersion(aggregateId: string): Promise<number> {
        const latest = await this.prisma.domainEvent.findFirst({
            where: { aggregateId },
            orderBy: { eventVersion: 'desc' },
            select: { eventVersion: true },
        });
        return latest?.eventVersion ?? 0;
    }

    /**
     * Snapshot support — save aggregate state to avoid replaying all events.
     */
    async saveSnapshot(
        aggregateId: string,
        aggregateType: AggregateType,
        state: Record<string, unknown>,
        version: number,
    ): Promise<void> {
        await this.prisma.aggregateSnapshot.upsert({
            where: { aggregateId },
            update: { state: state as object, version, takenAt: new Date() },
            create: {
                aggregateId,
                aggregateType,
                state: state as object,
                version,
                takenAt: new Date(),
            },
        });
    }

    /**
     * Load the latest snapshot for an aggregate.
     */
    async loadSnapshot(aggregateId: string) {
        return this.prisma.aggregateSnapshot.findUnique({
            where: { aggregateId },
        });
    }

    /**
     * Build a typed event envelope for publishing to Kafka or other consumers.
     */
    toEnvelope<T extends Record<string, unknown>>(event: StoredEvent): EventEnvelope<T> {
        return {
            eventId: event.id,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType as AggregateType,
            eventType: event.eventType,
            eventVersion: event.eventVersion,
            payload: event.payload as T,
            metadata: event.metadata,
            occurredAt: event.occurredAt.toISOString(),
        };
    }
}
