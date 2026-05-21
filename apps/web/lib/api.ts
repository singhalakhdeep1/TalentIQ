import axios from 'axios';
import { Candidate, HiringFunnel, Job, PaginationMeta } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
});

export async function fetchJobs(params?: { page?: number; limit?: number }): Promise<{ data: Job[]; meta: PaginationMeta }> {
    const response = await api.get('/jobs', { params });
    return response.data;
}

export async function fetchJob(jobId: string): Promise<Job> {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
}

export async function fetchCandidates(params?: { page?: number; limit?: number }): Promise<{ data: Candidate[]; meta: PaginationMeta }> {
    const response = await api.get('/candidates', { params });
    return response.data;
}

export async function fetchCandidate(candidateId: string): Promise<Candidate> {
    const response = await api.get(`/candidates/${candidateId}`);
    return response.data;
}

export async function fetchCandidateTimeline(candidateId: string): Promise<Array<Record<string, unknown>>> {
    const response = await api.get(`/candidates/${candidateId}/timeline`);
    return response.data;
}

export async function updateCandidateStatus(candidateId: string, status: string): Promise<void> {
    await api.patch(`/candidates/${candidateId}/status`, { status });
}

export async function fetchHiringFunnel(jobId: string): Promise<HiringFunnel> {
    const response = await api.get(`/analytics/jobs/${jobId}/funnel`);
    return response.data;
}
