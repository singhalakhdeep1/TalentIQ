CREATE DATABASE IF NOT EXISTS talentiq_analytics;

CREATE TABLE IF NOT EXISTS talentiq_analytics.recruitment_events
(
    event_type String,
    aggregate_id String,
    aggregate_type String,
    organization_id String,
    payload String,
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (organization_id, aggregate_type, event_type, created_at);
