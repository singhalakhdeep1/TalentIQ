'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchCandidate, fetchCandidateTimeline } from '@/lib/api';

interface TimelineEvent {
    eventType?: string;
    occurredAt?: string;
}

export default function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const { data: candidate } = useQuery({
        queryKey: ['candidate', id],
        queryFn: () => fetchCandidate(id),
    });
    const { data: timeline } = useQuery({
        queryKey: ['candidateTimeline', id],
        queryFn: () => fetchCandidateTimeline(id),
    });

    return (
        <div className="grid gap-6 xl:grid-cols-3 animate-rise">
            <section className="panel rounded-2xl p-6 xl:col-span-1">
                <h2 className="font-heading text-2xl">
                    {candidate?.firstName} {candidate?.lastName}
                </h2>
                <p className="mt-2 text-textMuted">{candidate?.email}</p>
                <p className="mt-6 rounded-lg bg-white/5 p-3 text-sm text-textMuted">
                    Current status: <span className="text-textPrimary">{candidate?.status ?? 'APPLIED'}</span>
                </p>
            </section>

            <section className="panel rounded-2xl p-6 xl:col-span-2">
                <h3 className="font-heading text-xl">Candidate Event Timeline</h3>
                <ul className="mt-4 space-y-3">
                    {((timeline ?? []) as TimelineEvent[]).map((event: TimelineEvent, index: number) => {
                        const eventType = String(event.eventType ?? 'UNKNOWN');
                        const occurredAt = event.occurredAt ? String(event.occurredAt) : undefined;
                        return (
                            <li key={`${eventType}-${index}`} className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <p className="font-medium">{eventType}</p>
                                <p className="mt-1 text-sm text-textMuted">
                                    {occurredAt ? format(new Date(occurredAt), 'PPpp') : 'Timestamp unavailable'}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
}
