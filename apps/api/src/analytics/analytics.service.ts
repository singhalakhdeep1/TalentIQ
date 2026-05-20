import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, ClickHouseClient } from '@clickhouse/client';

export interface HiringFunnelMetrics {
    jobId: string;
    applied: number;
    screening: number;
    interviewScheduled: number;
    interviewCompleted: number;
    shortlisted: number;
    offerExtended: number;
    hired: number;
    rejected: number;
    avgTimeToHireDays: number;
    avgScreeningScoreHired: number;
}

export interface RecruitmentTrends {
    date: string;
    applicationsReceived: number;
    interviewsCompleted: number;
    offersExtended: number;
    hires: number;
}

@Injectable()
export class AnalyticsService implements OnModuleInit {
    private readonly logger = new Logger(AnalyticsService.name);
    private client!: ClickHouseClient;

    constructor(private readonly config: ConfigService) { }

    onModuleInit() {
        this.client = createClient({
            url: this.config.get<string>('clickhouse.url', 'http://localhost:8123'),
            username: this.config.get<string>('clickhouse.username', 'default'),
            password: this.config.get<string>('clickhouse.password', ''),
            database: this.config.get<string>('clickhouse.database', 'talentiq'),
        });
        this.ensureSchema();
    }

    private async ensureSchema(): Promise<void> {
        try {
            await this.client.exec({
                query: `
          CREATE TABLE IF NOT EXISTS recruitment_events (
            event_id       UUID        DEFAULT generateUUIDv4(),
            event_type     String,
            job_id         String,
            candidate_id   String,
            application_id String,
            status         String,
            score          Float32     DEFAULT 0,
            occurred_at    DateTime64(3) DEFAULT now(),
            metadata       String      DEFAULT '{}'
          ) ENGINE = MergeTree()
          ORDER BY (job_id, occurred_at)
          PARTITION BY toYYYYMM(occurred_at)
        `,
            });
            this.logger.log('ClickHouse schema ready');
        } catch (err: any) {
            this.logger.warn(`ClickHouse schema init failed (may already exist): ${err.message}`);
        }
    }

    async trackEvent(event: {
        eventType: string;
        jobId: string;
        candidateId: string;
        applicationId?: string;
        status?: string;
        score?: number;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        await this.client.insert({
            table: 'recruitment_events',
            values: [
                {
                    event_type: event.eventType,
                    job_id: event.jobId,
                    candidate_id: event.candidateId,
                    application_id: event.applicationId ?? '',
                    status: event.status ?? '',
                    score: event.score ?? 0,
                    metadata: JSON.stringify(event.metadata ?? {}),
                },
            ],
            format: 'JSONEachRow',
        });
    }

    async getHiringFunnel(jobId: string): Promise<HiringFunnelMetrics> {
        const result = await this.client.query({
            query: `
        SELECT
          job_id                                                      AS jobId,
          countIf(status = 'APPLIED')                                 AS applied,
          countIf(status = 'SCREENING')                               AS screening,
          countIf(status = 'INTERVIEW_SCHEDULED')                     AS interviewScheduled,
          countIf(status = 'INTERVIEW_COMPLETED')                     AS interviewCompleted,
          countIf(status = 'SHORTLISTED')                             AS shortlisted,
          countIf(status = 'OFFER_EXTENDED')                          AS offerExtended,
          countIf(status = 'HIRED')                                   AS hired,
          countIf(status = 'REJECTED')                                AS rejected,
          avgIf(dateDiff('day', minOccurred, occurred_at), status = 'HIRED') AS avgTimeToHireDays,
          avgIf(score, status = 'HIRED')                              AS avgScreeningScoreHired
        FROM (
          SELECT *, min(occurred_at) OVER (PARTITION BY application_id) AS minOccurred
          FROM recruitment_events
          WHERE job_id = {jobId: String}
        )
        GROUP BY job_id
      `,
            query_params: { jobId },
            format: 'JSONEachRow',
        });

        const rows = await result.json<HiringFunnelMetrics>();
        return (
            rows[0] ?? {
                jobId,
                applied: 0, screening: 0, interviewScheduled: 0,
                interviewCompleted: 0, shortlisted: 0, offerExtended: 0,
                hired: 0, rejected: 0, avgTimeToHireDays: 0, avgScreeningScoreHired: 0,
            }
        );
    }

    async getRecruitmentTrends(
        organizationId: string,
        days = 30,
    ): Promise<RecruitmentTrends[]> {
        const result = await this.client.query({
            query: `
        SELECT
          toDate(occurred_at)                      AS date,
          countIf(event_type = 'APPLICATION')       AS applicationsReceived,
          countIf(event_type = 'INTERVIEW_DONE')    AS interviewsCompleted,
          countIf(event_type = 'OFFER_SENT')        AS offersExtended,
          countIf(event_type = 'HIRED')             AS hires
        FROM recruitment_events
        WHERE occurred_at >= now() - INTERVAL {days: Int32} DAY
          AND JSONExtractString(metadata, 'organizationId') = {orgId: String}
        GROUP BY date
        ORDER BY date
      `,
            query_params: { days, orgId: organizationId },
            format: 'JSONEachRow',
        });

        return result.json<RecruitmentTrends>();
    }
}
