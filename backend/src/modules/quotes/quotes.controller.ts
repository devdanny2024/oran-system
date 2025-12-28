import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { GenerateQuotesDto } from './dto/generate-quotes.dto';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('project/:projectId')
  async listForProject(@Param('projectId') projectId: string) {
    return this.quotesService.listForProject(projectId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.quotesService.getById(id);
  }

  @Post('generate')
  async generate(@Body() dto: GenerateQuotesDto) {
    return this.quotesService.generateForProject(dto.projectId);
  }
}
