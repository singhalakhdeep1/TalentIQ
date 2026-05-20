import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkillsGraphService } from './skills-graph.service';

@ApiTags('Skills Graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('skills-graph')
export class SkillsGraphController {
    constructor(private readonly skillsGraph: SkillsGraphService) { }

    @Post('candidates/:id/skills')
    @ApiOperation({ summary: 'Upsert candidate skills into Neo4j knowledge graph' })
    async upsertCandidateSkills(
        @Param('id') candidateId: string,
        @Body() body: { skills: Array<{ name: string; category: string; yearsExp?: number }> },
    ) {
        await this.skillsGraph.upsertCandidateSkills(candidateId, body.skills);
        return { message: 'Skills updated' };
    }

    @Post('jobs/:id/skills')
    @ApiOperation({ summary: 'Upsert job required skills into Neo4j' })
    async upsertJobSkills(
        @Param('id') jobId: string,
        @Body() body: { requiredSkills: string[]; niceToHaveSkills?: string[] },
    ) {
        await this.skillsGraph.upsertJobSkills(jobId, body.requiredSkills, body.niceToHaveSkills);
        return { message: 'Job skills updated' };
    }

    @Get('jobs/:jobId/match/:candidateId')
    @ApiOperation({ summary: 'Compute Neo4j skill-match score for candidate vs job' })
    async computeMatch(@Param('jobId') jobId: string, @Param('candidateId') candidateId: string) {
        const score = await this.skillsGraph.computeSkillMatchScore(candidateId, jobId);
        return { candidateId, jobId, skillMatchScore: score };
    }

    @Get('jobs/:jobId/candidates')
    @ApiOperation({ summary: 'Find top candidates by skill graph match' })
    async similarCandidates(@Param('jobId') jobId: string) {
        return this.skillsGraph.findSimilarCandidatesBySkills(jobId);
    }

    @Get('skills/:name/related')
    @ApiOperation({ summary: 'Traverse knowledge graph to find related skills' })
    async relatedSkills(@Param('name') name: string) {
        const related = await this.skillsGraph.getRelatedSkills(name);
        return { skill: name, relatedSkills: related };
    }
}
