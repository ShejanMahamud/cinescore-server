import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  getHello() {
    return {
      success: true,
      message: 'Server Operational',
      meta: {
        uptime: `${Math.floor(process.uptime())}ms`,
      },
    };
  }
}
