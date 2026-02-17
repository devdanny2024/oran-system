import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DemoVideosService } from './demo-videos.service';
import { FileInterceptor } from '@nestjs/platform-express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require('multer');
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

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

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const dir = join(process.cwd(), 'uploads', 'demo-videos');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const safeBase = file.originalname
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .slice(0, 60);
          const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${safeBase || 'video'}-${suffix}${extname(file.originalname) || '.mp4'}`);
        },
      }),
      limits: { fileSize: 250 * 1024 * 1024 },
      fileFilter: (_req: any, file: any, cb: any) => {
        if (file.mimetype?.startsWith('video/')) return cb(null, true);
        cb(new BadRequestException('Only video files are allowed.'), false);
      },
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Video file is required.');
    return {
      src: `/uploads/demo-videos/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
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
