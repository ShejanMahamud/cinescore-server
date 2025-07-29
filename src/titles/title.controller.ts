import { Body, Controller, Post } from '@nestjs/common';
import { CreateTitleDto } from './dto/create-title.dto';
import { TitleService } from './title.service';

@Controller('titles')
export class TitleController {
  constructor(private titleService: TitleService) {}

  @Post('add')
  addTitle(@Body() dto: CreateTitleDto) {
    return this.titleService.createTitle(dto);
  }
}
