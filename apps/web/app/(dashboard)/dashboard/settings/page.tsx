'use client';

import { useState } from 'react';

export default function SettingsPage() {
    const [saved, setSaved] = useState(false);
    const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 text-sm mt-1">Manage your TalentIQ configuration</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6 bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-white">API Configuration</h2>

                <div>
                    <label className="block text-sm text-gray-400 mb-1">API Base URL</label>
                    <input
                        type="url"
                        value={apiUrl}
                        onChange={e => setApiUrl(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Set via NEXT_PUBLIC_API_URL environment variable</p>
                </div>

                <div className="flex items-center justify-end gap-3">
                    {saved && <span className="text-green-400 text-sm">Settings saved</span>}
                    <button
                        type="submit"
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg text-sm transition"
                    >
                        Save changes
                    </button>
                </div>
            </form>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white">Account</h2>
                <button
                    onClick={() => {
                        localStorage.removeItem('accessToken');
                        window.location.href = '/auth/login';
                    }}
                    className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 font-medium rounded-lg text-sm transition"
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}
