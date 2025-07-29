import { Module } from '@nestjs/common';
import { TitleController } from './title.controller';
import { TitleService } from './title.service';

@Module({
  imports: [],
  providers: [TitleService],
  controllers: [TitleController],
})
export class TitleModule {}
