'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCandidates } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';

export default function CandidatesPage() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useQuery({
        queryKey: ['candidates', page],
        queryFn: () => fetchCandidates({ page, limit: 20 }),
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Candidates</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {data?.meta.total ?? 0} total candidates
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading candidates…</div>
            ) : (
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400">
                                <th className="text-left px-6 py-3 font-medium">Name</th>
                                <th className="text-left px-6 py-3 font-medium">Email</th>
                                <th className="text-left px-6 py-3 font-medium">Status</th>
                                <th className="text-left px-6 py-3 font-medium">Applied</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {data?.data.map(c => (
                                <tr key={c.id} className="hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-4 text-white font-medium">
                                        {c.firstName} {c.lastName}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">{c.email}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs bg-violet-900/40 text-violet-300 border border-violet-800/50">
                                            {c.status ?? 'New'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy') : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/candidates/${c.id}`}
                                            className="text-violet-400 hover:text-violet-300 text-xs font-medium"
                                        >
                                            View →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data && data.meta.totalPages > 1 && (
                        <div className="px-6 py-4 flex justify-between items-center border-t border-gray-800">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="text-sm text-gray-400 hover:text-white disabled:opacity-40"
                            >
                                ← Previous
                            </button>
                            <span className="text-sm text-gray-400">
                                Page {page} of {data.meta.totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                                disabled={page === data.meta.totalPages}
                                className="text-sm text-gray-400 hover:text-white disabled:opacity-40"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
