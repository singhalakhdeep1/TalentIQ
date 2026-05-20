'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
    interviewId: string;
    candidateId: string;
    jobId: string;
}

export function VoiceInterviewPlayer({ interviewId, candidateId, jobId }: Props) {
    const [transcript, setTranscript] = useState<string[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<string>('Press start to begin interview.');
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
        });

        socket.on('interview:transcript', (payload: { text: string }) => {
            if (payload.text) setTranscript((prev) => [...prev, payload.text]);
        });

        socket.on('interview:analysis', (payload: { summary?: string }) => {
            if (payload.summary) {
                setTranscript((prev) => [...prev, `AI Summary: ${payload.summary}`]);
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [socket]);

    async function startInterview() {
        socketRef.current?.emit('interview:start', { interviewId, candidateId, jobId });
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (event) => {
            const arrayBuffer = await event.data.arrayBuffer();
            socketRef.current?.emit('interview:audio-chunk', {
                interviewId,
                audioBuffer: Array.from(new Uint8Array(arrayBuffer)),
            });
        };

        recorder.start(3000);
        setRecording(true);
    }

    function stopInterview() {
        mediaRecorderRef.current?.stop();
        socketRef.current?.emit('interview:end', { interviewId, candidateId, jobId });
        setRecording(false);
    }

    return (
        <section className="space-y-4">
            <div className="panel rounded-2xl p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-textMuted">Current Prompt</p>
                <p className="mt-3 text-xl font-medium">{currentQuestion}</p>
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
        </section>
    );
}
