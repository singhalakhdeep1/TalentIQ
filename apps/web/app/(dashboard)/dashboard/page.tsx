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

    const openRoles = jobs?.data?.filter((job) => job.status === 'OPEN') ?? [];
    const candidateList = candidates?.data ?? [];
    const screeningReady = candidateList.filter((candidate) => ['SCREENING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(candidate.status ?? 'APPLIED'));
    const topSkillDemand = Array.from(
        openRoles
            .flatMap((job) => job.requiredSkills)
            .reduce((map, skill) => {
                map.set(skill, (map.get(skill) ?? 0) + 1);
                return map;
            }, new Map<string, number>()),
    )
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4);

    return (
        <div className="space-y-6 animate-rise">
            <section className="grid gap-4 md:grid-cols-3">
                <div className="panel rounded-2xl p-5">
                    <p className="text-sm text-textMuted">Open Roles</p>
                    <p className="mt-2 text-3xl font-semibold">{openRoles.length}</p>
                </div>
                <div className="panel rounded-2xl p-5">
                    <p className="text-sm text-textMuted">Candidates In Pipeline</p>
                    <p className="mt-2 text-3xl font-semibold">{candidates?.meta?.total ?? 0}</p>
                </div>
                <div className="panel rounded-2xl p-5">
                    <p className="text-sm text-textMuted">Interview Readiness</p>
                    <p className="mt-2 text-3xl font-semibold">
                        {candidateList.length > 0 ? Math.round((screeningReady.length / candidateList.length) * 100) : 0}%
                    </p>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="panel rounded-2xl p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-textMuted">AI Recruiting Cockpit</p>
                    <h2 className="mt-3 font-heading text-2xl">Where the team should focus next</h2>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-textMuted">Top Skill Demand</p>
                            <p className="mt-2 text-lg font-semibold">{topSkillDemand[0]?.[0] ?? 'No open roles'}</p>
                            <p className="mt-1 text-xs text-textMuted">Appears in {topSkillDemand[0]?.[1] ?? 0} open role requirements.</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-textMuted">Shortlist Pressure</p>
                            <p className="mt-2 text-lg font-semibold">{candidateList.filter((candidate) => candidate.status === 'SHORTLISTED').length}</p>
                            <p className="mt-1 text-xs text-textMuted">Candidates are waiting for interview calibration.</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-textMuted">Active Hiring Markets</p>
                            <p className="mt-2 text-lg font-semibold">{new Set(openRoles.map((job) => job.location).filter(Boolean)).size}</p>
                            <p className="mt-1 text-xs text-textMuted">Distinct locations across currently open roles.</p>
                        </div>
                    </div>
                </div>

                <div className="panel rounded-2xl p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-textMuted">Demand Snapshot</p>
                    <ul className="mt-4 space-y-3">
                        {topSkillDemand.map(([skill, count]) => (
                            <li key={skill} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                <span>{skill}</span>
                                <span className="text-sm text-textMuted">{count} roles</span>
                            </li>
                        ))}
                        {topSkillDemand.length === 0 ? <li className="text-sm text-textMuted">Open roles will populate the demand view.</li> : null}
                    </ul>
                </div>
            </section>

            <section>
                <h2 className="mb-3 font-heading text-xl">Live Candidate Pipeline</h2>
                <CandidatePipeline candidates={candidateList} />
            </section>
        </div>
    );
}
