import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CredentialsService, CredentialData } from './credentials.service';

@ApiTags('Credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credentials')
export class CredentialsController {
    constructor(private readonly credentialsService: CredentialsService) { }

    @Post('mint')
    @ApiOperation({ summary: 'Mint ERC-721 hiring credential NFT for a hired candidate' })
    async mint(
        @Body()
        body: {
            candidateId: string;
            walletAddress: string;
            credential: CredentialData;
        },
    ) {
        return this.credentialsService.mintCredential(
            body.candidateId,
            body.walletAddress,
            body.credential,
        );
    }

    @Get(':id/verify')
    @ApiOperation({ summary: 'Verify credential authenticity on-chain' })
    async verify(@Param('id') id: string) {
        return this.credentialsService.verifyCredential(id);
    }

    @Get('candidates/:candidateId')
    @ApiOperation({ summary: 'List all credentials for a candidate' })
    async listByCandidate(@Param('candidateId') candidateId: string) {
        return this.credentialsService.getCredentialsByCandidate(candidateId);
    }
}
