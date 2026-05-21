'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useMemo, useRef, useState } from 'react';

interface InterviewAnalysis {
    score: number;
    strengths: string[];
    concerns: string[];
    recommendation: 'ADVANCE' | 'HOLD' | 'REJECT';
    summary: string;
}

interface Props {
    interviewId: string;
    candidateId: string;
    jobId: string;
}

export function VoiceInterviewPlayer({ interviewId, candidateId, jobId }: Props) {
    const [transcript, setTranscript] = useState<string[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<string>('Press start to begin interview.');
    const [questionIndex, setQuestionIndex] = useState(0);
    const [sessionStatus, setSessionStatus] = useState('Ready');
    const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const socket = useMemo(
        () =>
            io(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/interview`, {
                transports: ['websocket'],
            }),
        [],
    );

    useEffect(() => {
        socketRef.current = socket;

        socket.on('interview:question', (payload: { question: string }) => {
            setCurrentQuestion(payload.question);
            if (typeof (payload as { questionIndex?: number }).questionIndex === 'number') {
                setQuestionIndex((payload as { questionIndex?: number }).questionIndex ?? 0);
            }
        });

        socket.on('interview:transcript', (payload: { text: string }) => {
            if (payload.text) setTranscript((prev) => [...prev, payload.text]);
        });

        socket.on('interview:analysis', (payload: InterviewAnalysis) => {
            setAnalysis(payload);
            if (payload.summary) {
                setTranscript((prev) => [...prev, `AI Summary: ${payload.summary}`]);
            }
        });

        socket.on('interview:complete', (payload: { message?: string }) => {
            setRecording(false);
            setSessionStatus(payload.message ?? 'Interview complete');
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [socket]);

    async function startInterview() {
        setAnalysis(null);
        setTranscript([]);
        setSessionStatus('Interview in progress');
        socketRef.current?.emit('interview:start', { interviewId, candidateId, jobId });
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (event) => {
            const arrayBuffer = await event.data.arrayBuffer();
            const binary = new Uint8Array(arrayBuffer);
            const base64Audio = window.btoa(String.fromCharCode(...binary));
            socketRef.current?.emit('interview:audio-chunk', {
                interviewId,
                audio: base64Audio,
                mimeType: event.data.type || 'audio/webm',
            });
        };

        recorder.start(3000);
        setRecording(true);
    }

    function stopInterview() {
        mediaRecorderRef.current?.stop();
        setSessionStatus('Finalizing analysis');
        socketRef.current?.emit('interview:end', { interviewId, candidateId, jobId });
        setRecording(false);
    }

    function requestFollowUp() {
        const answer = transcript.slice(-4).join(' ').trim();
        if (!answer) return;

        socketRef.current?.emit('interview:answer-complete', { questionIndex, answer });
        setSessionStatus('Generating follow-up question');
    }

    return (
        <section className="space-y-4">
            <div className="panel rounded-2xl p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-textMuted">Current Prompt</p>
                <p className="mt-3 text-xl font-medium">{currentQuestion}</p>
                <p className="mt-3 text-sm text-textMuted">Status: {sessionStatus}</p>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={startInterview}
                    disabled={recording}
                    className="rounded-xl bg-accent px-4 py-2 font-semibold text-[#051016] disabled:opacity-40"
                >
                    Start Interview
                </button>
                <button
                    type="button"
                    onClick={stopInterview}
                    disabled={!recording}
                    className="rounded-xl border border-white/25 px-4 py-2 font-semibold disabled:opacity-40"
                >
                    End Interview
                </button>
                <button
                    type="button"
                    onClick={requestFollowUp}
                    disabled={!recording || transcript.length === 0}
                    className="rounded-xl border border-accent/40 px-4 py-2 font-semibold text-accent disabled:opacity-40"
                >
                    Ask Follow-up
                </button>
            </div>

            <div className="panel max-h-72 overflow-y-auto rounded-2xl p-5">
                <h3 className="font-heading text-lg">Live Transcript</h3>
                <ul className="mt-3 space-y-2 text-sm text-textMuted">
                    {transcript.map((line, index) => (
                        <li key={`${line.slice(0, 12)}-${index}`} className="rounded-lg bg-white/5 p-2">
                            {line}
                        </li>
                    ))}
                </ul>
            </div>

            {analysis ? (
                <div className="panel rounded-2xl p-5">
                    <h3 className="font-heading text-lg">Interview Analysis</h3>
                    <p className="mt-2 text-sm text-textMuted">Recommendation: {analysis.recommendation}</p>
                    <p className="mt-1 text-3xl font-semibold">{analysis.score}/100</p>
                    <p className="mt-3 text-sm text-textMuted">{analysis.summary}</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-sm font-semibold">Strengths</p>
                            <ul className="mt-2 space-y-2 text-sm text-textMuted">
                                {analysis.strengths.map((item) => (
                                    <li key={item} className="rounded-lg bg-white/5 p-2">{item}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Concerns</p>
                            <ul className="mt-2 space-y-2 text-sm text-textMuted">
                                {analysis.concerns.map((item) => (
                                    <li key={item} className="rounded-lg bg-white/5 p-2">{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
