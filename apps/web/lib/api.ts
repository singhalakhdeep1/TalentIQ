import { Candidate, HiringFunnel, Job, PaginationMeta } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init.headers },
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw Object.assign(new Error(data?.message ?? res.statusText), { status: res.status, data });
    return data as T;
}

export async function fetchJobs(params?: { page?: number; limit?: number }): Promise<{ data: Job[]; meta: PaginationMeta }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiFetch(`/jobs?${qs}`);
}

export async function fetchJob(jobId: string): Promise<Job> {
    return apiFetch(`/jobs/${jobId}`);
}

export async function createJob(body: Partial<Job>): Promise<Job> {
    return apiFetch('/jobs', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchCandidates(params?: { page?: number; limit?: number }): Promise<{ data: Candidate[]; meta: PaginationMeta }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiFetch(`/candidates?${qs}`);
}

export async function fetchCandidate(candidateId: string): Promise<Candidate> {
    return apiFetch(`/candidates/${candidateId}`);
}

export async function fetchCandidateTimeline(candidateId: string): Promise<Array<Record<string, unknown>>> {
    return apiFetch(`/candidates/${candidateId}/timeline`);
}

export async function updateCandidateStatus(candidateId: string, status: string): Promise<void> {
    return apiFetch(`/candidates/${candidateId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function fetchHiringFunnel(jobId: string): Promise<HiringFunnel> {
    return apiFetch(`/analytics/jobs/${jobId}/funnel`);
}

export async function fetchCredentials(candidateId: string): Promise<Array<{ id: string; type: string; issuedAt: string; verified: boolean }>> {
    return apiFetch(`/credentials/candidates/${candidateId}`);
}

export async function fetchOrgTrends(orgId: string): Promise<Array<Record<string, unknown>>> {
    return apiFetch(`/analytics/organizations/${orgId}/trends`);
}
