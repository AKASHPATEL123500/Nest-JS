import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) { }

    canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers['authorization'] || req.headers['Authorization'];
        if (!auth) throw new UnauthorizedException('Missing Authorization header');
        const parts = (Array.isArray(auth) ? auth[0] : auth).split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') throw new UnauthorizedException('Invalid Authorization header');
        const token = parts[1];
        const user = this.authService.verifyToken(token);
        if (!user) throw new UnauthorizedException('Invalid or expired token');
        req.user = user;
        req.token = token;
        return true;
    }
}
