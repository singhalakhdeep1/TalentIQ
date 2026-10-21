'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message ?? 'Login failed');
            }
            const { accessToken } = await res.json();
            localStorage.setItem('accessToken', accessToken);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">TalentIQ</h1>
                    <p className="mt-2 text-gray-400">Sign in to your account</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-8 rounded-xl border border-gray-800">
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                            placeholder="you@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                    <p className="text-center text-sm text-gray-500">
                        Don&apos;t have an account?{' '}
                        <Link href="/auth/register" className="text-violet-400 hover:underline">Register</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
