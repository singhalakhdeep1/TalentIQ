'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCredentials } from '@/lib/api';
import { useParams } from 'next/navigation';

export default function CredentialsPage() {
    const { id } = useParams<{ id: string }>();

    const { data: credentials, isLoading } = useQuery({
        queryKey: ['credentials', id],
        queryFn: () => fetchCredentials(id),
    });

    if (isLoading) return <div className="text-textMuted">Loading credentials…</div>;

    return (
        <div className="space-y-6 animate-rise">
            <h1 className="font-heading text-2xl">Verifiable Credentials</h1>

            {credentials && credentials.length > 0 ? (
                <div className="space-y-3">
                    {credentials.map((cred) => (
                        <div key={cred.id} className="panel rounded-2xl p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{cred.type}</p>
                                    <p className="mt-1 text-sm text-textMuted">
                                        Issued {new Date(cred.issuedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${cred.verified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {cred.verified ? 'Verified' : 'Pending'}
                                </span>
                            </div>
                            <p className="mt-2 font-mono text-xs text-textMuted break-all">{cred.id}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="panel rounded-2xl p-6 text-center text-textMuted">
                    No credentials issued for this candidate yet.
                </div>
            )}
        </div>
    );
}
