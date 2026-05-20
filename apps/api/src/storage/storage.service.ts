import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly logger = new Logger(StorageService.name);
    private readonly client: Minio.Client;
    private readonly defaultBucket: string;

    constructor(private readonly config: ConfigService) {
        this.defaultBucket = this.config.get<string>('minio.bucket', 'talentiq');
        this.client = new Minio.Client({
            endPoint: this.config.get<string>('minio.endpoint', 'localhost'),
            port: this.config.get<number>('minio.port', 9000),
            useSSL: this.config.get<boolean>('minio.ssl', false),
            accessKey: this.config.get<string>('minio.accessKey', 'minioadmin'),
            secretKey: this.config.get<string>('minio.secretKey', 'minioadmin'),
        });
    }

    async onModuleInit() {
        const exists = await this.client.bucketExists(this.defaultBucket);
        if (!exists) {
            await this.client.makeBucket(this.defaultBucket, 'us-east-1');
            this.logger.log(`Bucket "${this.defaultBucket}" created`);
        }
    }

    async putObject(
        key: string,
        data: Buffer | Readable,
        contentType = 'application/octet-stream',
    ): Promise<string> {
        const size = Buffer.isBuffer(data) ? data.length : undefined;
        await this.client.putObject(
            this.defaultBucket,
            key,
            data,
            size,
            { 'Content-Type': contentType },
        );
        return key;
    }

    async getObject(key: string): Promise<Buffer> {
        const stream = await this.client.getObject(this.defaultBucket, key);
        return new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }

    async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
        return this.client.presignedGetObject(this.defaultBucket, key, expirySeconds);
    }

    async deleteObject(key: string): Promise<void> {
        await this.client.removeObject(this.defaultBucket, key);
    }

    async objectExists(key: string): Promise<boolean> {
        try {
            await this.client.statObject(this.defaultBucket, key);
            return true;
        } catch {
            return false;
        }
    }
}
