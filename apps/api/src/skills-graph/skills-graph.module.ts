import { Module } from '@nestjs/common';
import { SkillsGraphService } from './skills-graph.service';
import { SkillsGraphController } from './skills-graph.controller';

@Module({
    controllers: [SkillsGraphController],
    providers: [SkillsGraphService],
    exports: [SkillsGraphService],
})
export class SkillsGraphModule { }
