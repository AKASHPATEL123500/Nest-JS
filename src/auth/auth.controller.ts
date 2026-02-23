import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('signup')
    async signup(@Body() dto: SignupDto) {
        return this.authService.signup(dto);
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @UseGuards(AuthGuard)
    @Post('logout')
    async logout(@Req() req: any) {
        this.authService.logout(req.token);
        return { ok: true };
    }

    @UseGuards(AuthGuard)
    @Get('profile')
    async profile(@Req() req: any) {
        return { user: req.user };
    }
}
