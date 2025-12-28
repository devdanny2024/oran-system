import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { GenerateQuotesDto } from './dto/generate-quotes.dto';
import { AddQuoteItemDto } from './dto/add-quote-item.dto';
import { UpdateQuoteItemDto } from './dto/update-quote-item.dto';

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

  @Patch(':id/select')
  async select(@Param('id') id: string) {
    return this.quotesService.selectQuote(id);
  }

  @Post(':id/items')
  async addItem(@Param('id') id: string, @Body() dto: AddQuoteItemDto) {
    return this.quotesService.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateQuoteItemDto,
  ) {
    return this.quotesService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.quotesService.removeItem(id, itemId);
  }
}
