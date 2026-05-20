import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    HttpCode,
    HttpStatus,
    Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CandidatesService, CreateCandidateDto, ListCandidatesDto } from './candidates.service';
import { CandidateApplicationStatus } from './commands/candidate.commands';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('candidates')
export class CandidatesController {
    constructor(
        private readonly candidatesService: CandidatesService,
        private readonly storageService: StorageService,
    ) { }

    // POST /candidates
    @Post()
    @ApiOperation({ summary: 'Register a new candidate' })
    async createCandidate(@Body() dto: CreateCandidateDto, @Request() req: any) {
        return this.candidatesService.createCandidate({
            ...dto,
            userId: req.user.id,
        });
    }

    // GET /candidates
    @Get()
    @ApiOperation({ summary: 'List candidates with filters and pagination' })
    async listCandidates(@Query() query: ListCandidatesDto) {
        return this.candidatesService.listCandidates(query);
    }

    // GET /candidates/:id
    @Get(':id')
    @ApiOperation({ summary: 'Get a single candidate with full details' })
    async getCandidate(@Param('id') id: string) {
        return this.candidatesService.getCandidate(id);
    }

    // GET /candidates/:id/timeline
    @Get(':id/timeline')
    @ApiOperation({ summary: 'Get full event-sourced timeline for a candidate' })
    async getCandidateTimeline(@Param('id') id: string) {
        return this.candidatesService.getCandidateTimeline(id);
    }

    // PATCH /candidates/:id/status
    @Patch(':id/status')
    @ApiOperation({ summary: 'Update candidate application status' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateStatus(
        @Param('id') id: string,
        @Body()
        body: {
            applicationId: string;
            status: CandidateApplicationStatus;
            reason?: string;
        },
        @Request() req: any,
    ) {
        await this.candidatesService.updateStatus(
            id,
            body.applicationId,
            body.status,
            body.reason,
            req.user.id,
        );
    }

    // POST /candidates/:id/resume
    @Post(':id/resume')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload resume (PDF/DOCX) — triggers AI parsing' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
    async uploadResume(
        @Param('id') candidateId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
                    new FileTypeValidator({
                        fileType: /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
                    }),
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        const storageKey = `resumes/${candidateId}/${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

        await this.storageService.putObject(storageKey, file.buffer, file.mimetype);

        await this.candidatesService.submitResume(candidateId, {
            storageKey,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            fileSizeBytes: file.size,
        });

        return { storageKey, message: 'Resume uploaded — AI parsing initiated' };
    }
}
