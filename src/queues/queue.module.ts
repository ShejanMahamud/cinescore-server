import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          password: config.get('REDIS_PASS'),
          port: config.get('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'mailer',
        defaultJobOptions: {
          attempts: 0,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: 'mailer-retry',
        defaultJobOptions: {
          attempts: 2,
          removeOnComplete: 100,
          removeOnFail: 50,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
