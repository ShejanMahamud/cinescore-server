import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { QueueModule } from 'src/queues';
import { MailRetryProcessor } from './mail-retry.processor';
import { MailProcessor } from './mail.processor';
import { MailService } from './mail.service';

@Module({
  imports: [
    QueueModule,
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('EMAIL_HOST') as string,
          port: config.get('EMAIL_PORT') as number,
          auth: {
            user: config.get('EMAIL_USER') as string,
            pass: config.get('EMAIL_PASS') as string,
          },
        },
        defaults: {
          from: `"No Reply - CineScore" <${config.get<string>('EMAIL_FROM')}>`,
        },
        template: {
          dir: join(process.cwd(), 'src', 'mail', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService, MailProcessor, MailRetryProcessor],
  exports: [MailService],
})
export class MailModule {}
