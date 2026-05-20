'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BriefcaseBusiness, LayoutDashboard, Mic2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/jobs/demo-job', label: 'Jobs', icon: BriefcaseBusiness },
    { href: '/dashboard/candidates/demo-candidate', label: 'Candidates', icon: Users },
    { href: '/dashboard/interviews/demo/voice', label: 'Voice Interview', icon: Mic2 },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden w-72 border-r border-white/10 bg-[#060c17]/90 p-6 lg:block">
            <div className="mb-10">
                <p className="font-heading text-2xl font-semibold tracking-tight">TalentIQ</p>
                <p className="mt-2 text-sm text-textMuted">Recruitment command center</p>
            </div>
            <nav className="space-y-2">
                {items.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors',
                                active
                                    ? 'bg-accent/20 text-textPrimary'
                                    : 'text-textMuted hover:bg-white/5 hover:text-textPrimary',
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
