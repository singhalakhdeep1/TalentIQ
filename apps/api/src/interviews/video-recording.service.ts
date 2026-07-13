/**
 * Video面试录制服务
 * 使用WebRTC录制视频面试并存储到云存储
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideoRecordingService {
  private readonly logger = new Logger(VideoRecordingService.name);
  private activeRecordings: Map<string, RecordingSession> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 开始视频录制会话
   */
  async startRecordingSession(
    interviewId: string,
    candidateId: string,
  ): Promise<{ sessionId: string; recordingUrl: string }> {
    const sessionId = uuidv4();

    const session: RecordingSession = {
      sessionId,
      interviewId,
      candidateId,
      startedAt: new Date(),
      status: 'recording',
      chunks: [],
    };

    this.activeRecordings.set(sessionId, session);

    // 在数据库中创建录制记录
    await this.prisma.interviewRecording.create({
      data: {
        id: sessionId,
        interviewId,
        candidateId,
        status: 'recording',
        startedAt: new Date(),
      },
    });

    this.logger.log(`Started recording session ${sessionId} for interview ${interviewId}`);

    return {
      sessionId,
      recordingUrl: `wss://api.talentiq.com/interviews/${interviewId}/record/${sessionId}`,
    };
  }

  /**
   * 接收视频数据块
   */
  async receiveChunk(
    sessionId: string,
    chunkData: Buffer,
    timestamp: number,
  ): Promise<void> {
    const session = this.activeRecordings.get(sessionId);
    if (!session) {
      throw new Error('Recording session not found');
    }

    session.chunks.push({
      data: chunkData,
      timestamp,
    });

    // 如果块数达到阈值，上传到存储
    if (session.chunks.length >= 10) {
      await this.uploadChunks(session);
      session.chunks = [];
    }
  }

  /**
   * 停止录制会话
   */
  async stopRecordingSession(sessionId: string): Promise<{ videoUrl: string; duration: number }> {
    const session = this.activeRecordings.get(sessionId);
    if (!session) {
      throw new Error('Recording session not found');
    }

    // 上传剩余的块
    if (session.chunks.length > 0) {
      await this.uploadChunks(session);
    }

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    // 合并所有块为最终视频
    const videoUrl = await this.mergeVideoChunks(sessionId);

    // 更新数据库记录
    await this.prisma.interviewRecording.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        endedAt,
        duration,
        videoUrl,
      },
    });

    // 清理会话
    this.activeRecordings.delete(sessionId);

    this.logger.log(`Stopped recording session ${sessionId}, duration: ${duration}s`);

    return { videoUrl, duration };
  }

  /**
   * 上传视频块到存储
   */
  private async uploadChunks(session: RecordingSession): Promise<void> {
    const chunkData = Buffer.concat(session.chunks.map(c => c.data));
    const chunkKey = `recordings/${session.sessionId}/chunk_${Date.now()}.webm`;

    await this.storage.uploadFile(chunkKey, chunkData, 'video/webm');
  }

  /**
   * 合并视频块
   */
  private async mergeVideoChunks(sessionId: string): Promise<string> {
    // 在生产环境中，这会使用FFmpeg合并视频块
    // 这里简化为返回一个模拟URL
    const videoKey = `recordings/${sessionId}/final.mp4`;
    const videoUrl = await this.storage.getPresignedUrl(videoKey, 86400); // 24小时

    return videoUrl;
  }

  /**
   * 获取录制状态
   */
  async getRecordingStatus(sessionId: string): Promise<RecordingStatus> {
    const session = this.activeRecordings.get(sessionId);
    const dbRecord = await this.prisma.interviewRecording.findUnique({
      where: { id: sessionId },
    });

    if (session) {
      return {
        sessionId,
        status: session.status,
        startedAt: session.startedAt,
        duration: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
      };
    }

    if (dbRecord) {
      return {
        sessionId: dbRecord.id,
        status: dbRecord.status,
        startedAt: dbRecord.startedAt,
        duration: dbRecord.duration || 0,
        videoUrl: dbRecord.videoUrl,
      };
    }

    throw new Error('Recording not found');
  }

  /**
   * 获取面试的所有录制
   */
  async getInterviewRecordings(interviewId: string): Promise<any[]> {
    return this.prisma.interviewRecording.findMany({
      where: { interviewId },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * 删除录制
   */
  async deleteRecording(sessionId: string): Promise<void> {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { id: sessionId },
    });

    if (recording && recording.videoUrl) {
      // 从存储中删除视频文件
      const key = this.extractKeyFromUrl(recording.videoUrl);
      await this.storage.deleteFile(key);
    }

    await this.prisma.interviewRecording.delete({
      where: { id: sessionId },
    });

    this.logger.log(`Deleted recording ${sessionId}`);
  }

  /**
   * 从URL提取存储键
   */
  private extractKeyFromUrl(url: string): string {
    // 简化实现，实际需要根据存储服务解析
    return url.split('/').pop();
  }
}

interface RecordingSession {
  sessionId: string;
  interviewId: string;
  candidateId: string;
  startedAt: Date;
  status: 'recording' | 'paused' | 'stopped';
  chunks: Array<{ data: Buffer; timestamp: number }>;
}

interface RecordingStatus {
  sessionId: string;
  status: string;
  startedAt: Date;
  duration: number;
  videoUrl?: string;
}
