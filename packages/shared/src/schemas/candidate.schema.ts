import { z } from 'zod';

export const createCandidateSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    linkedInUrl: z.string().url().optional(),
    portfolioUrl: z.string().url().optional(),
});

export const updateCandidateStatusSchema = z.object({
    status: z.enum([
        'APPLIED',
        'RESUME_RECEIVED',
        'SCREENING',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_COMPLETED',
        'OFFERED',
        'HIRED',
        'REJECTED',
    ]),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateStatusInput = z.infer<typeof updateCandidateStatusSchema>;
