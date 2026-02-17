import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DemoVideosService } from './demo-videos.service';

@Controller('content/demo-videos')
export class DemoVideosController {
  constructor(private readonly demoVideos: DemoVideosService) {}

  @Get()
  listAll() {
    return this.demoVideos.listAll();
  }

  @Get('active')
  listActive() {
    return this.demoVideos.listActive();
  }

  @Post()
  create(
    @Body()
    body: {
      title: string;
      src: string;
      cost?: string | null;
      location?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.demoVideos.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      src?: string;
      cost?: string | null;
      location?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.demoVideos.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.demoVideos.remove(id);
  }
}
