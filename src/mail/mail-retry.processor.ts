import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailJobData } from './mail.processor';

@Processor('mailer-retry', { concurrency: 10 })
export class MailRetryProcessor extends WorkerHost {
  constructor(private mailerService: MailerService) {
    super();
  }
  async process(job: Job<MailJobData>): Promise<any> {
    const { name, data } = job;

    switch (name) {
      case 'account-verify-retry':
        return this.mailerService.sendMail({
          to: data.to,
          subject: 'Verify Your Email!',
          template: 'account-verify-email.hbs',
          context: {
            userName: data.userName,
            verificationLink: data.verificationLink,
            year: data.year,
          },
        });

      default:
        throw new NotFoundException(`Email job type '${name}' not found`);
    }
  }
}
