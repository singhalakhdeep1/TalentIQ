import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InterviewsService } from './interviews.service';

interface VoiceSessionContext {
    interviewId: string;
    candidateId: string;
    jobId: string;
    startedAt: Date;
    transcriptBuffer: string;
}

@WebSocketGateway({ namespace: '/interview', cors: { origin: '*' } })
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server!: Server;
    private readonly logger = new Logger(InterviewGateway.name);
    private readonly sessions = new Map<string, VoiceSessionContext>();

    constructor(private readonly interviewsService: InterviewsService) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        const session = this.sessions.get(client.id);
        if (session) {
            this.logger.log(`Client disconnected mid-session: ${client.id}, interview=${session.interviewId}`);
            this.sessions.delete(client.id);
        }
    }

    // ─── Start voice interview session ────────────────────────────────────────
    @SubscribeMessage('interview:start')
    async handleStart(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        payload: { interviewId: string; candidateId: string; jobId: string },
    ) {
        const ctx: VoiceSessionContext = {
            ...payload,
            startedAt: new Date(),
            transcriptBuffer: '',
        };
        this.sessions.set(client.id, ctx);

        const openingQuestion = await this.interviewsService.getOpeningQuestion(payload.jobId);

        // Send opening question back to the client — client converts TTS on their end
        // (or we could pipe to GPT-4o Realtime API if using WebRTC)
        client.emit('interview:question', { question: openingQuestion, questionIndex: 0 });
        this.logger.log(`Interview session started: ${payload.interviewId}`);
    }

    // ─── Receive audio chunk (base64 PCM) and transcribe ─────────────────────
    @SubscribeMessage('interview:audio-chunk')
    async handleAudioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { audio: string; mimeType: string },
    ) {
        const session = this.sessions.get(client.id);
        if (!session) return client.emit('error', { message: 'No active session' });

        // Transcribe via Whisper (delegated to AI microservice)
        const transcript = await this.interviewsService.transcribeAudioChunk(
            Buffer.from(payload.audio, 'base64'),
            payload.mimeType,
        );

        if (transcript) {
            session.transcriptBuffer += ` ${transcript}`;
            client.emit('interview:transcript', { text: transcript, partial: true });
        }
    }

    // ─── Candidate finishes answering — get AI follow-up ─────────────────────
    @SubscribeMessage('interview:answer-complete')
    async handleAnswerComplete(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { questionIndex: number; answer: string },
    ) {
        const session = this.sessions.get(client.id);
        if (!session) return;

        const followUp = await this.interviewsService.getFollowUpQuestion(
            session.jobId,
            payload.answer,
            payload.questionIndex,
        );

        if (followUp) {
            client.emit('interview:question', {
                question: followUp,
                questionIndex: payload.questionIndex + 1,
            });
        } else {
            // No more questions — end session
            client.emit('interview:complete', { message: 'Interview completed. Thank you!' });
            await this.handleEnd(client, { reason: 'COMPLETED' });
        }
    }

    // ─── End session — persist transcript, trigger analysis ──────────────────
    @SubscribeMessage('interview:end')
    async handleEnd(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { reason: 'COMPLETED' | 'ABANDONED' | 'ERROR' },
    ) {
        const session = this.sessions.get(client.id);
        if (!session) return;

        this.sessions.delete(client.id);

        await this.interviewsService.finalizeSession(
            session.interviewId,
            session.candidateId,
            session.jobId,
            session.transcriptBuffer.trim(),
            session.startedAt,
            payload.reason,
        );

        this.logger.log(`Interview session ended: ${session.interviewId} (${payload.reason})`);
    }
}
