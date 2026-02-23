import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './interfaces/user.interface';
import { randomUUID, randomBytes, pbkdf2Sync, createHmac } from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'dev-secret-please-change';
const TOKEN_EXP_MS = 1000 * 60 * 60 * 24; // 24 hours

@Injectable()
export class AuthService {
    private users: User[] = [];
    private tokenBlacklist = new Set<string>();

    async signup(dto: SignupDto) {
        const exists = this.users.find(u => u.email === dto.email);
        if (exists) throw new ConflictException('Email already registered');

        const salt = randomBytes(16).toString('hex');
        const passwordHash = this.hashPassword(dto.password, salt);
        const user: User = {
            id: randomUUID(),
            name: dto.name,
            email: dto.email,
            passwordHash,
            salt,
        };
        this.users.push(user);
        const token = this.generateToken({ sub: user.id, email: user.email });
        return { user: this.safeUser(user), token };
    }

    async login(dto: LoginDto) {
        const user = this.users.find(u => u.email === dto.email);
        if (!user) throw new UnauthorizedException('Invalid credentials');
        const hash = this.hashPassword(dto.password, user.salt);
        if (hash !== user.passwordHash) throw new UnauthorizedException('Invalid credentials');
        const token = this.generateToken({ sub: user.id, email: user.email });
        return { user: this.safeUser(user), token };
    }

    logout(token: string) {
        if (token) this.tokenBlacklist.add(token);
    }

    verifyToken(token: string) {
        if (!token) return null;
        if (this.tokenBlacklist.has(token)) return null;
        const parts = token.split('.');
        if (parts.length !== 2) return null;
        const payloadB64 = parts[0];
        const sig = parts[1];
        const expected = createHmac('sha256', SECRET).update(payloadB64).digest('hex');
        if (!timingSafeEqualHex(expected, sig)) return null;
        try {
            const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
            const payload = JSON.parse(payloadJson) as any;
            if (Date.now() > payload.exp) return null;
            const user = this.users.find(u => u.id === payload.sub);
            if (!user) return null;
            return this.safeUser(user);
        } catch (e) {
            return null;
        }
    }

    private generateToken(payload: { sub: string; email: string }) {
        const body = {
            sub: payload.sub,
            email: payload.email,
            iat: Date.now(),
            exp: Date.now() + TOKEN_EXP_MS,
        };
        const bodyStr = JSON.stringify(body);
        const bodyB64 = Buffer.from(bodyStr).toString('base64');
        const sig = createHmac('sha256', SECRET).update(bodyB64).digest('hex');
        return `${bodyB64}.${sig}`;
    }

    private hashPassword(password: string, salt: string) {
        return pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
    }

    private safeUser(user: User) {
        const { passwordHash, salt, ...rest } = user as any;
        return rest as Partial<User>;
    }
}

function timingSafeEqualHex(a: string, b: string) {
    try {
        const ab = Buffer.from(a, 'hex');
        const bb = Buffer.from(b, 'hex');
        if (ab.length !== bb.length) return false;
        return cryptoSafeEqual(ab, bb);
    } catch (e) {
        return false;
    }
}

function cryptoSafeEqual(a: Buffer, b: Buffer) {
    // Use constant-time comparison
    if (a.length !== b.length) return false;
    let res = 0;
    for (let i = 0; i < a.length; i++) res |= a[i] ^ b[i];
    return res === 0;
}
