export interface Job {
    id: string;
    title: string;
    department?: string;
    location?: string;
    status: 'OPEN' | 'CLOSED' | string;
    requiredSkills: string[];
    createdAt?: string;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface Candidate {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status?: string;
    createdAt?: string;
}

export interface CandidateScore {
    candidateId: string;
    jobId: string;
    resumeScore: number;
    skillsMatchScore: number;
    interviewScore: number;
    overallScore: number;
}

export interface HiringFunnel {
    totalApplicants: number;
    screened: number;
    shortlisted: number;
    interviewed: number;
    offered: number;
    hired: number;
    rejected: number;
    avgTimeToHireDays: number;
    avgScreeningScoreHired: number;
}
