import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ServiceFeesService } from './service-fees.service';

@Controller('service-fees')
export class ServiceFeesController {
  constructor(private readonly serviceFees: ServiceFeesService) {}

  @Get()
  list() {
    return this.serviceFees.list();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      type: 'INSTALLATION' | 'INTEGRATION' | 'TRANSPORT' | 'OTHER';
      technicianAmount: number;
      clientAmount: number;
    },
  ) {
    return this.serviceFees.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      type?: 'INSTALLATION' | 'INTEGRATION' | 'TRANSPORT' | 'OTHER';
      technicianAmount?: number;
      clientAmount?: number;
      active?: boolean;
    },
  ) {
    return this.serviceFees.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceFees.remove(id);
  }
}
