'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '', organization: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function update(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message ?? 'Registration failed');
            }
            const { accessToken } = await res.json();
            localStorage.setItem('accessToken', accessToken);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">TalentIQ</h1>
                    <p className="mt-2 text-gray-400">Create your account</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-8 rounded-xl border border-gray-800">
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    {(['name', 'email', 'organization', 'password'] as const).map(field => (
                        <div key={field}>
                            <label className="block text-sm text-gray-400 mb-1 capitalize">{field}</label>
                            <input
                                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                                value={form[field]}
                                onChange={update(field)}
                                required
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                            />
                        </div>
                    ))}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                    >
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>
                    <p className="text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-violet-400 hover:underline">Sign in</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
