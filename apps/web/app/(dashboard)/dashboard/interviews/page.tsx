'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';

interface Interview {
    id: string;
    candidateName?: string;
    jobTitle?: string;
    status?: string;
    scheduledAt?: string;
}

async function fetchInterviews(): Promise<Interview[]> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/interviews`, {
        headers: {
            Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : ''}`,
        },
    });
    if (!res.ok) return [];
    return res.json();
}

const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
    IN_PROGRESS: 'bg-yellow-900/40 text-yellow-300 border-yellow-800/50',
    COMPLETED: 'bg-green-900/40 text-green-300 border-green-800/50',
    CANCELLED: 'bg-red-900/40 text-red-300 border-red-800/50',
};

export default function InterviewsPage() {
    const { data = [], isLoading } = useQuery({
        queryKey: ['interviews'],
        queryFn: fetchInterviews,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Interviews</h1>
                <p className="text-gray-400 text-sm mt-1">{data.length} interviews found</p>
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading interviews…</div>
            ) : data.length === 0 ? (
                <div className="text-center py-16 text-gray-500">No interviews scheduled yet.</div>
            ) : (
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400">
                                <th className="text-left px-6 py-3 font-medium">Candidate</th>
                                <th className="text-left px-6 py-3 font-medium">Job</th>
                                <th className="text-left px-6 py-3 font-medium">Status</th>
                                <th className="text-left px-6 py-3 font-medium">Scheduled</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {data.map(i => (
                                <tr key={i.id} className="hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-4 text-white font-medium">{i.candidateName ?? '—'}</td>
                                    <td className="px-6 py-4 text-gray-400">{i.jobTitle ?? '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs border ${STATUS_COLORS[i.status ?? ''] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                            {i.status ?? 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {i.scheduledAt ? format(new Date(i.scheduledAt), 'MMM d, yyyy HH:mm') : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/interviews/${i.id}/voice`}
                                            className="text-violet-400 hover:text-violet-300 text-xs font-medium"
                                        >
                                            Join →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
