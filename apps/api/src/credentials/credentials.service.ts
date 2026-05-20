import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

// ERC-721 minimal ABI for minting
const CREDENTIAL_NFT_ABI = [
    'function mint(address to, uint256 tokenId, string calldata tokenURI) external returns (uint256)',
    'function tokenURI(uint256 tokenId) external view returns (string)',
    'function ownerOf(uint256 tokenId) external view returns (address)',
];

export interface CredentialData {
    candidateName: string;
    jobTitle: string;
    company: string;
    hiredAt: string;
    skills: string[];
    recruiterSignature?: string;
}

@Injectable()
export class CredentialsService {
    private readonly logger = new Logger(CredentialsService.name);
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet;
    private contract: ethers.Contract;

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const rpcUrl = config.get<string>('ethereum.rpcUrl', 'http://localhost:8545');
        const privateKey = config.get<string>('ethereum.privateKey', '');
        const contractAddress = config.get<string>('ethereum.contractAddress', '');

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.signer = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(contractAddress, CREDENTIAL_NFT_ABI, this.signer);
    }

    // ─── Mint ERC-721 hiring credential NFT ──────────────────────────────────
    async mintCredential(
        candidateId: string,
        walletAddress: string,
        data: CredentialData,
    ): Promise<{ tokenId: string; txHash: string; credentialId: string }> {
        const credentialId = uuidv4();
        // Token ID = uint256 derived from UUID
        const tokenId = BigInt('0x' + credentialId.replace(/-/g, ''));

        // Build token URI (IPFS/Arweave URI in production; base64 data URI for dev)
        const metadata = {
            name: `TalentIQ Credential — ${data.jobTitle}`,
            description: `Verified hiring credential for ${data.candidateName}`,
            attributes: [
                { trait_type: 'Job Title', value: data.jobTitle },
                { trait_type: 'Company', value: data.company },
                { trait_type: 'Hired At', value: data.hiredAt },
                { trait_type: 'Skills', value: data.skills.join(', ') },
            ],
            image: 'https://talentiq.app/credential-nft.png',
        };

        const tokenUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

        try {
            const tx = await this.contract.mint(walletAddress, tokenId, tokenUri);
            const receipt: ethers.TransactionReceipt = await tx.wait();

            // Persist credential in DB
            await this.prisma.credential.create({
                data: {
                    id: credentialId,
                    candidateId,
                    tokenId: tokenId.toString(),
                    txHash: receipt.hash,
                    contractAddress: await this.contract.getAddress(),
                    walletAddress,
                    metadata: metadata as any,
                    mintedAt: new Date(),
                },
            });

            this.logger.log(`Credential minted: tokenId=${tokenId} tx=${receipt.hash}`);
            return { tokenId: tokenId.toString(), txHash: receipt.hash, credentialId };
        } catch (err: any) {
            this.logger.error(`Credential minting failed: ${err.message}`);
            throw err;
        }
    }

    // ─── Verify credential on-chain ──────────────────────────────────────────
    async verifyCredential(credentialId: string): Promise<{
        valid: boolean;
        owner?: string;
        tokenUri?: string;
    }> {
        const cred = await this.prisma.credential.findUnique({ where: { id: credentialId } });
        if (!cred) return { valid: false };

        try {
            const owner: string = await this.contract.ownerOf(BigInt(cred.tokenId));
            const tokenUri: string = await this.contract.tokenURI(BigInt(cred.tokenId));
            return {
                valid: owner.toLowerCase() === cred.walletAddress.toLowerCase(),
                owner,
                tokenUri,
            };
        } catch {
            return { valid: false };
        }
    }

    async getCredentialsByCandidate(candidateId: string) {
        return this.prisma.credential.findMany({
            where: { candidateId },
            orderBy: { mintedAt: 'desc' },
        });
    }
}
