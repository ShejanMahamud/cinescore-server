import { MailerService } from '@nestjs-modules/mailer';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Job } from 'bullmq';

type MailJobData = {
  to: string;
  userName: string;
  verificationLink: string;
  year: number;
};

@Processor('mailer', { concurrency: 10 })
export class MailProcessor extends WorkerHost {
  constructor(private mailerService: MailerService) {
    super();
  }

  async process(job: Job<MailJobData>): Promise<any> {
    const { name, data } = job;

    switch (name) {
      case 'account-verify-email':
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

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    console.log('Job completed:', job.id);
  }
}
