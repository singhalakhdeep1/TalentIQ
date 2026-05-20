'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Candidate } from '@/types';
import { updateCandidateStatus } from '@/lib/api';

const STATUSES = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'HIRED', 'REJECTED'];

export function CandidatePipeline({ candidates }: { candidates: Candidate[] }) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateCandidateStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidates'] }),
    });

    return (
        <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
            {STATUSES.map((status) => (
                <section key={status} className="panel rounded-2xl p-4">
                    <h3 className="mb-3 font-heading text-sm tracking-wide text-textMuted">{status}</h3>
                    <div className="space-y-3">
                        {candidates
                            .filter((candidate) => (candidate.status ?? 'APPLIED') === status)
                            .map((candidate) => (
                                <article key={candidate.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <p className="font-medium text-textPrimary">
                                        {candidate.firstName} {candidate.lastName}
                                    </p>
                                    <p className="truncate text-xs text-textMuted">{candidate.email}</p>
                                    <select
                                        className="mt-3 w-full rounded-lg border border-white/10 bg-[#0d1522] p-2 text-xs"
                                        value={candidate.status ?? 'APPLIED'}
                                        onChange={(event) => mutation.mutate({ id: candidate.id, status: event.target.value })}
                                    >
                                        {STATUSES.map((state) => (
                                            <option key={state} value={state}>
                                                {state}
                                            </option>
                                        ))}
                                    </select>
                                </article>
                            ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
