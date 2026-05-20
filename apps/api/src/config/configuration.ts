export default () => ({
    port: parseInt(process.env.PORT ?? '4000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',

    database: {
        url: process.env.DATABASE_URL,
    },

    redis: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    },

    neo4j: {
        uri: process.env.NEO4J_URI ?? 'bolt://localhost:7687',
        user: process.env.NEO4J_USER ?? 'neo4j',
        password: process.env.NEO4J_PASSWORD ?? 'password',
    },

    clickhouse: {
        url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
        user: process.env.CLICKHOUSE_USER ?? 'default',
        password: process.env.CLICKHOUSE_PASSWORD ?? '',
        database: process.env.CLICKHOUSE_DB ?? 'talentiq_analytics',
    },

    minio: {
        endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
        port: parseInt(process.env.MINIO_PORT ?? '9002', 10),
        accessKey: process.env.MINIO_ACCESS_KEY ?? 'talentiq',
        secretKey: process.env.MINIO_SECRET_KEY ?? 'talentiq_minio',
        bucketResumes: process.env.MINIO_BUCKET_RESUMES ?? 'resumes',
        bucketRecordings: process.env.MINIO_BUCKET_RECORDINGS ?? 'recordings',
    },

    jwt: {
        secret: process.env.JWT_SECRET ?? 'changeme',
        expiry: process.env.JWT_EXPIRY ?? '7d',
    },

    openai: {
        apiKey: process.env.OPENAI_API_KEY ?? '',
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-large',
        chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
        realtimeModel: process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview',
    },

    aiService: {
        url: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
    },

    kafka: {
        broker: process.env.KAFKA_BROKER ?? 'localhost:9092',
        groupId: process.env.KAFKA_GROUP_ID ?? 'talentiq-api',
    },

    ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL ?? '',
        contractAddress: process.env.CREDENTIAL_CONTRACT_ADDRESS ?? '',
        deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY ?? '',
    },
});
