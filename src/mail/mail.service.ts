import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class MailService {
  constructor(@InjectQueue('mailer') private mailQueue: Queue) {}

  async sendAccountVerifyEmail(data: {
    to: string;
    userName: string;
    verificationLink: string;
    year: number;
  }) {
    await this.mailQueue.add('account-verify-email', data, {
      attempts: 0,
      removeOnComplete: {
        age: 1800,
        count: 100,
      },
      removeOnFail: {
        age: 900,
        count: 50,
      },
    });
  }
}
