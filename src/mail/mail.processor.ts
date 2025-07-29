import { MailerService } from '@nestjs-modules/mailer';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from 'src/prisma';

export type MailJobData = {
  to: string;
  userName: string;
  verificationLink: string;
  year: number;
};

@Processor('mailer', { concurrency: 10 })
export class MailProcessor extends WorkerHost {
  constructor(
    @InjectQueue('mailer-retry') private retryQueue: Queue,
    private mailerService: MailerService,
    private prisma: PrismaService,
  ) {
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

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await this.prisma.failedJob.create({
      data: {
        jobName: job.name,
        error: errorMessage,
        attempts: job.attemptsMade,
      },
    });
    return this.retryQueue.add('account-verify-retry', job.data);
  }
}
