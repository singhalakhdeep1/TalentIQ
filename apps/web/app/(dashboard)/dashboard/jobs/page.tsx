'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/lib/api';
import Link from 'next/link';

export default function JobsPage() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useQuery({
        queryKey: ['jobs', page],
        queryFn: () => fetchJobs({ page, limit: 20 }),
    });

    const jobs = data?.data ?? [];
    const meta = data?.meta;

    return (
        <div className="space-y-6 animate-rise">
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl">Job Openings</h1>
                <Link href="/dashboard/jobs/create" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/80">
                    + Post Job
                </Link>
            </div>

            {isLoading ? (
                <div className="text-textMuted">Loading jobs...</div>
            ) : (
                <div className="space-y-3">
                    {jobs.map((job) => (
                        <Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="panel block rounded-2xl p-5 hover:bg-white/5 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{job.title}</p>
                                    <p className="mt-1 text-sm text-textMuted">{job.department} • {job.location}</p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${job.status === 'OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                    {job.status}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {job.requiredSkills.slice(0, 4).map((skill) => (
                                    <span key={skill} className="rounded-full border border-accent/30 px-2 py-0.5 text-xs text-accent">
                                        {skill}
                                    </span>
                                ))}
                                {job.requiredSkills.length > 4 && (
                                    <span className="text-xs text-textMuted">+{job.requiredSkills.length - 4} more</span>
                                )}
                            </div>
                        </Link>
                    ))}
                    {jobs.length === 0 && <p className="text-textMuted">No jobs posted yet.</p>}
                </div>
            )}

            {meta && meta.totalPages > 1 && (
                <div className="flex items-center gap-3">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm disabled:opacity-40">
                        Previous
                    </button>
                    <span className="text-sm text-textMuted">Page {page} of {meta.totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm disabled:opacity-40">
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
