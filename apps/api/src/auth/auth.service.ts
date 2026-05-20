import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'RECRUITER' | 'HIRING_MANAGER' | 'ADMIN';
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
    ) { }

    async register(dto: RegisterDto): Promise<TokenPair> {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) throw new ConflictException('Email already registered');

        const hashedPassword = await argon2.hash(dto.password, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 4,
        });

        const user = await this.prisma.user.create({
            data: {
                id: uuidv4(),
                email: dto.email,
                passwordHash: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: dto.role ?? 'RECRUITER',
            },
        });

        return this.generateTokenPair(user.id, user.email, user.role);
    }

    async login(dto: LoginDto): Promise<TokenPair> {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const valid = await argon2.verify(user.passwordHash, dto.password);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        return this.generateTokenPair(user.id, user.email, user.role);
    }

    async refreshTokens(refreshToken: string): Promise<TokenPair> {
        let payload: { sub: string; email: string; role: string };
        try {
            payload = this.jwt.verify(refreshToken, {
                secret: this.config.get<string>('jwt.refreshSecret'),
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
        return this.generateTokenPair(user.id, user.email, user.role);
    }

    private generateTokenPair(userId: string, email: string, role: string): TokenPair {
        const expiresIn = 3600; // 1 hour
        const accessToken = this.jwt.sign(
            { sub: userId, email, role },
            {
                secret: this.config.get<string>('jwt.secret'),
                expiresIn,
            },
        );

        const refreshToken = this.jwt.sign(
            { sub: userId, email, role },
            {
                secret: this.config.get<string>('jwt.refreshSecret'),
                expiresIn: '7d',
            },
        );

        return { accessToken, refreshToken, expiresIn };
    }
}
