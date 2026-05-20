'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHiringFunnel, fetchJob } from '@/lib/api';
import { HiringFunnelChart } from '@/components/HiringFunnelChart';

export default function JobDetailsPage({ params }: { params: { id: string } }) {
    const { data: job, isLoading: jobLoading } = useQuery({
        queryKey: ['job', params.id],
        queryFn: () => fetchJob(params.id),
    });

    const { data: funnel, isLoading: funnelLoading } = useQuery({
        queryKey: ['funnel', params.id],
        queryFn: () => fetchHiringFunnel(params.id),
    });

    if (jobLoading || funnelLoading) {
        return <div className="text-textMuted">Loading job intelligence...</div>;
    }

    return (
        <div className="space-y-6 animate-rise">
            <section className="panel rounded-2xl p-6">
                <h2 className="font-heading text-2xl">{job?.title}</h2>
                <p className="mt-2 text-textMuted">{job?.department} • {job?.location}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {(job?.requiredSkills ?? []).map((skill) => (
                        <span key={skill} className="rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">
                            {skill}
                        </span>
                    ))}
                </div>
            </section>
            {funnel ? <HiringFunnelChart funnel={funnel} /> : null}
        </div>
    );
}
