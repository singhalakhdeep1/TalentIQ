import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';

export interface SkillNode {
    id: string;
    name: string;
    category: string;
    level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

export interface SkillMatch {
    skill: string;
    similarity: number;
    relatedSkills: string[];
}

@Injectable()
export class SkillsGraphService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SkillsGraphService.name);
    private driver!: Driver;

    constructor(private readonly config: ConfigService) { }

    onModuleInit() {
        this.driver = neo4j.driver(
            this.config.get<string>('neo4j.uri', 'bolt://localhost:7687'),
            neo4j.auth.basic(
                this.config.get<string>('neo4j.username', 'neo4j'),
                this.config.get<string>('neo4j.password', 'password'),
            ),
        );
        this.ensureConstraints();
    }

    async onModuleDestroy() {
        await this.driver.close();
    }

    private async ensureConstraints(): Promise<void> {
        const session = this.driver.session();
        try {
            await session.run(`CREATE CONSTRAINT IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE`);
            await session.run(`CREATE CONSTRAINT IF NOT EXISTS FOR (c:Candidate) REQUIRE c.id IS UNIQUE`);
            await session.run(`CREATE CONSTRAINT IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE`);
            this.logger.log('Neo4j constraints ensured');
        } catch (err: any) {
            this.logger.warn(`Neo4j constraint setup: ${err.message}`);
        } finally {
            await session.close();
        }
    }

    // ─── Upsert candidate skills from parsed resume ───────────────────────────
    async upsertCandidateSkills(
        candidateId: string,
        skills: Array<{ name: string; category: string; yearsExp?: number }>,
    ): Promise<void> {
        const session = this.driver.session();
        try {
            // Merge candidate node
            await session.run(
                `MERGE (c:Candidate {id: $candidateId}) SET c.updatedAt = datetime()`,
                { candidateId },
            );

            for (const skill of skills) {
                await session.run(
                    `
          MERGE (s:Skill {name: $name})
          ON CREATE SET s.id = randomUUID(), s.category = $category
          MERGE (c:Candidate {id: $candidateId})
          MERGE (c)-[r:HAS_SKILL]->(s)
          ON CREATE SET r.yearsExp = $yearsExp, r.createdAt = datetime()
          ON MATCH  SET r.yearsExp = $yearsExp, r.updatedAt = datetime()
          `,
                    { name: skill.name.toLowerCase(), category: skill.category, yearsExp: skill.yearsExp ?? 0, candidateId },
                );
            }
        } finally {
            await session.close();
        }
    }

    // ─── Upsert job required skills ──────────────────────────────────────────
    async upsertJobSkills(
        jobId: string,
        requiredSkills: string[],
        niceToHaveSkills: string[] = [],
    ): Promise<void> {
        const session = this.driver.session();
        try {
            await session.run(`MERGE (j:Job {id: $jobId})`, { jobId });
            for (const skill of requiredSkills) {
                await session.run(
                    `
          MERGE (s:Skill {name: $name}) ON CREATE SET s.id = randomUUID()
          MERGE (j:Job {id: $jobId})
          MERGE (j)-[:REQUIRES {priority: 'MUST_HAVE'}]->(s)
          `,
                    { name: skill.toLowerCase(), jobId },
                );
            }
            for (const skill of niceToHaveSkills) {
                await session.run(
                    `
          MERGE (s:Skill {name: $name}) ON CREATE SET s.id = randomUUID()
          MERGE (j:Job {id: $jobId})
          MERGE (j)-[:REQUIRES {priority: 'NICE_TO_HAVE'}]->(s)
          `,
                    { name: skill.toLowerCase(), jobId },
                );
            }
        } finally {
            await session.close();
        }
    }

    // ─── Compute skill-based match score ─────────────────────────────────────
    async computeSkillMatchScore(candidateId: string, jobId: string): Promise<number> {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
        MATCH (c:Candidate {id: $candidateId})-[:HAS_SKILL]->(s:Skill)
        MATCH (j:Job {id: $jobId})-[r:REQUIRES]->(s)
        WITH count(s) AS matchedSkills, r.priority AS priority
        MATCH (j:Job {id: $jobId})-[:REQUIRES {priority: 'MUST_HAVE'}]->(required:Skill)
        WITH matchedSkills, count(required) AS totalRequired
        RETURN toFloat(matchedSkills) / CASE WHEN totalRequired = 0 THEN 1 ELSE totalRequired END AS matchScore
        `,
                { candidateId, jobId },
            );
            const score = result.records[0]?.get('matchScore') ?? 0;
            return Math.min(Math.round(score * 100), 100);
        } finally {
            await session.close();
        }
    }

    // ─── Find skill-similar candidates ───────────────────────────────────────
    async findSimilarCandidatesBySkills(
        jobId: string,
        limit = 10,
    ): Promise<Array<{ candidateId: string; matchScore: number; matchedSkills: string[] }>> {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
        MATCH (j:Job {id: $jobId})-[:REQUIRES]->(s:Skill)<-[:HAS_SKILL]-(c:Candidate)
        WITH c, collect(s.name) AS matchedSkills, count(s) AS matchCount
        MATCH (j2:Job {id: $jobId})-[:REQUIRES {priority: 'MUST_HAVE'}]->(req:Skill)
        WITH c, matchedSkills, matchCount, count(req) AS totalRequired
        RETURN c.id AS candidateId,
               matchedSkills,
               toFloat(matchCount) / CASE WHEN totalRequired = 0 THEN 1 ELSE totalRequired END AS matchScore
        ORDER BY matchScore DESC
        LIMIT $limit
        `,
                { jobId, limit: neo4j.int(limit) },
            );

            return result.records.map((r) => ({
                candidateId: r.get('candidateId'),
                matchScore: Math.round(r.get('matchScore') * 100),
                matchedSkills: r.get('matchedSkills'),
            }));
        } finally {
            await session.close();
        }
    }

    // ─── Check drug/skill interaction (knowledge graph traversal) ────────────
    async getRelatedSkills(skillName: string, depth = 2): Promise<string[]> {
        const session = this.driver.session();
        try {
            const result = await session.run(
                `
        MATCH (s:Skill {name: $name})-[:RELATED_TO*1..${depth}]->(related:Skill)
        RETURN DISTINCT related.name AS relatedSkill
        LIMIT 20
        `,
                { name: skillName.toLowerCase() },
            );
            return result.records.map((r) => r.get('relatedSkill'));
        } finally {
            await session.close();
        }
    }
}
