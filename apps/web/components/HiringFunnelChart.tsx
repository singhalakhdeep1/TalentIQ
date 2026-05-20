'use client';

import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from 'recharts';
import { HiringFunnel } from '@/types';

export function HiringFunnelChart({ funnel }: { funnel: HiringFunnel }) {
    const data = [
        { stage: 'Applied', value: funnel.totalApplicants },
        { stage: 'Screened', value: funnel.screened },
        { stage: 'Shortlisted', value: funnel.shortlisted },
        { stage: 'Interviewed', value: funnel.interviewed },
        { stage: 'Offered', value: funnel.offered },
        { stage: 'Hired', value: funnel.hired },
    ];

    return (
        <div className="panel h-80 rounded-2xl p-4">
            <h3 className="mb-4 font-heading text-lg">Hiring Funnel</h3>
            <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                    <Tooltip />
                    <Funnel dataKey="value" data={data} isAnimationActive fill="#30c8b5">
                        <LabelList position="right" fill="#f5f7ff" stroke="none" dataKey="stage" />
                    </Funnel>
                </FunnelChart>
            </ResponsiveContainer>
        </div>
    );
}
