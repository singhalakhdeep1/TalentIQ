'use client';

import { VoiceInterviewPlayer } from '@/components/VoiceInterviewPlayer';

export default function VoiceInterviewPage({ params }: { params: { id: string } }) {
    return (
        <div className="space-y-6 animate-rise">
            <section>
                <h2 className="font-heading text-3xl">Voice Interview Session</h2>
                <p className="mt-2 text-textMuted">
                    Real-time interview orchestration with Whisper transcription and GPT-driven follow-ups.
                </p>
            </section>

            <VoiceInterviewPlayer interviewId={params.id} candidateId="demo-candidate" jobId="demo-job" />
        </div>
    );
}
