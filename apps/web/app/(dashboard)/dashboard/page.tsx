'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCandidates, fetchJobs } from '@/lib/api';
import { CandidatePipeline } from '@/components/CandidatePipeline';

export default function DashboardPage() {
    const { data: jobs } = useQuery({ queryKey: ['jobs'], queryFn: () => fetchJobs({ page: 1, limit: 10 }) });
    const { data: candidates } = useQuery({
        queryKey: ['candidates'],
        queryFn: () => fetchCandidates({ page: 1, limit: 60 }),
    });

    return (
        <div className="space-y-6 animate-rise">
            <section className="grid gap-4 md:grid-cols-3">
                <div className="panel rounded-2xl p-5">
                    <p className="text-sm text-textMuted">Open Roles</p>
                    <p className="mt-2 text-3xl font-semibold">{jobs?.data?.filter((job) => job.status === 'OPEN').length ?? 0}</p>
                </div>
                <div className="panel rounded-2xl p-5">
                    <p className="text-sm text-textMuted">Candidates In Pipeline</p>
                    <p className="mt-2 text-3xl font-semibold">{candidates?.total ?? 0}</p>
                </div>
                <div className="panel rounded-2xl p-5">
                    <p className="text-sm text-textMuted">Interview Readiness</p>
                    <p className="mt-2 text-3xl font-semibold">93%</p>
                </div>
            </section>

            <section>
                <h2 className="mb-3 font-heading text-xl">Live Candidate Pipeline</h2>
                <CandidatePipeline candidates={candidates?.data ?? []} />
            </section>
        </div>
    );
}
