'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createJob } from '@/lib/api';

export default function CreateJobPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [form, setForm] = useState({ title: '', department: '', location: '', description: '' });

    const addSkill = () => {
        const s = skillInput.trim();
        if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
        setSkillInput('');
    };

    const removeSkill = (skill: string) => setSkills((prev) => prev.filter((s) => s !== skill));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const job = await createJob({ ...form, requiredSkills: skills, status: 'OPEN' });
            router.push(`/dashboard/jobs/${job.id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 animate-rise">
            <h1 className="font-heading text-2xl">Post New Job</h1>

            <form onSubmit={handleSubmit} className="panel rounded-2xl p-6 space-y-5">
                {error && <p className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">{error}</p>}

                {(['title', 'department', 'location'] as const).map((field) => (
                    <div key={field}>
                        <label className="mb-1 block text-sm capitalize text-textMuted">{field}</label>
                        <input
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            value={form[field]}
                            onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                            required={field === 'title'}
                        />
                    </div>
                ))}

                <div>
                    <label className="mb-1 block text-sm text-textMuted">Description</label>
                    <textarea
                        rows={4}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        value={form.description}
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm text-textMuted">Required Skills</label>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="e.g. React"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        />
                        <button type="button" onClick={addSkill} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
                            Add
                        </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {skills.map((skill) => (
                            <span key={skill} className="flex items-center gap-1 rounded-full border border-accent/40 px-3 py-1 text-xs text-accent">
                                {skill}
                                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-white">×</button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={loading} className="rounded-xl bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50">
                        {loading ? 'Posting...' : 'Post Job'}
                    </button>
                    <button type="button" onClick={() => router.back()} className="rounded-xl border border-white/10 px-5 py-2 text-sm hover:bg-white/5">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
