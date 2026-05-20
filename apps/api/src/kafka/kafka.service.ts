import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';

export interface DomainEventMessage {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    payload: Record<string, unknown>;
    occurredAt: string;
    correlationId?: string;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaService.name);
    private kafka!: Kafka;
    private producer!: Producer;
    private consumers: Consumer[] = [];

    readonly TOPICS = {
        DOMAIN_EVENTS: 'talentiq.domain-events',
        CANDIDATE_EVENTS: 'talentiq.candidate-events',
        RESUME_PARSED: 'talentiq.resume-parsed',
        SCREENING_RESULTS: 'talentiq.screening-results',
        NOTIFICATIONS: 'talentiq.notifications',
    };

    constructor(private readonly config: ConfigService) { }

    async onModuleInit() {
        const brokers = this.config.get<string>('kafka.brokers', 'localhost:9092').split(',');

        this.kafka = new Kafka({
            clientId: 'talentiq-api',
            brokers,
            connectionTimeout: 5000,
            retry: { retries: 3 },
        });

        this.producer = this.kafka.producer({ idempotent: true });

        try {
            await this.producer.connect();
            this.logger.log('Kafka producer connected');

            // Ensure topics exist
            const admin = this.kafka.admin();
            await admin.connect();
            await admin.createTopics({
                topics: Object.values(this.TOPICS).map((topic) => ({
                    topic,
                    numPartitions: 3,
                    replicationFactor: 1,
                })),
                waitForLeaders: true,
            });
            await admin.disconnect();
        } catch (err: any) {
            this.logger.warn(`Kafka init warning (non-fatal): ${err.message}`);
        }
    }

    async onModuleDestroy() {
        await this.producer?.disconnect();
        await Promise.all(this.consumers.map((c) => c.disconnect()));
    }

    async publish(topic: string, message: DomainEventMessage): Promise<void> {
        await this.producer.send({
            topic,
            messages: [
                {
                    key: message.aggregateId,
                    value: JSON.stringify(message),
                    headers: {
                        eventType: message.eventType,
                        correlationId: message.correlationId ?? '',
                    },
                },
            ],
        });
    }

    async publishBatch(topic: string, messages: DomainEventMessage[]): Promise<void> {
        await this.producer.send({
            topic,
            messages: messages.map((m) => ({
                key: m.aggregateId,
                value: JSON.stringify(m),
            })),
        });
    }

    async subscribe(
        topic: string,
        groupId: string,
        handler: (message: DomainEventMessage) => Promise<void>,
    ): Promise<void> {
        const consumer = this.kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ message }: { topic: string; partition: number; message: KafkaMessage }) => {
                try {
                    const data = JSON.parse(message.value?.toString() ?? '{}') as DomainEventMessage;
                    await handler(data);
                } catch (err: any) {
                    this.logger.error(`Kafka consumer error on ${topic}: ${err.message}`);
                }
            },
        });

        this.consumers.push(consumer);
    }
}
