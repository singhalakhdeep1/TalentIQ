import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class AppModule { }
