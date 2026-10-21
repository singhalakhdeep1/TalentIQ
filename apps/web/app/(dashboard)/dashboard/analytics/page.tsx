'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHiringFunnel, fetchOrgTrends } from '@/lib/api';
import { HiringFunnelChart } from '@/components/HiringFunnelChart';

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? 'default-org';

export default function AnalyticsPage() {
    const [jobId, setJobId] = useState('');

    const { data: funnel, isLoading: funnelLoading, refetch } = useQuery({
        queryKey: ['funnel', jobId],
        queryFn: () => fetchHiringFunnel(jobId),
        enabled: jobId.trim().length > 0,
    });

    const { data: trends } = useQuery({
        queryKey: ['trends', ORG_ID],
        queryFn: () => fetchOrgTrends(ORG_ID),
    });

    return (
        <div className="space-y-8 animate-rise">
            <h1 className="font-heading text-2xl">Recruiting Analytics</h1>

            <section className="panel rounded-2xl p-6 space-y-4">
                <h2 className="font-semibold">Hiring Funnel by Job</h2>
                <div className="flex gap-3">
                    <input
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Enter Job ID…"
                        value={jobId}
                        onChange={(e) => setJobId(e.target.value)}
                    />
                    <button onClick={() => refetch()} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
                        Load
                    </button>
                </div>

                {funnelLoading && <p className="text-textMuted text-sm">Loading funnel…</p>}
                {funnel && <HiringFunnelChart funnel={funnel} />}
                {funnel && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mt-4">
                        {[
                            ['Total Applicants', funnel.totalApplicants],
                            ['Screened', funnel.screened],
                            ['Shortlisted', funnel.shortlisted],
                            ['Interviewed', funnel.interviewed],
                            ['Offered', funnel.offered],
                            ['Hired', funnel.hired],
                        ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <p className="text-xs text-textMuted">{label}</p>
                                <p className="mt-1 text-xl font-semibold">{value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {trends && Array.isArray(trends) && trends.length > 0 && (
                <section className="panel rounded-2xl p-6 space-y-4">
                    <h2 className="font-semibold">Organisation Trends</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-textMuted">
                                    {Object.keys(trends[0] as object).map((k) => <th key={k} className="pb-2 pr-4 font-medium">{k}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {trends.map((row, i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        {Object.values(row as object).map((v, j) => (
                                            <td key={j} className="py-2 pr-4 text-textMuted">{String(v)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
