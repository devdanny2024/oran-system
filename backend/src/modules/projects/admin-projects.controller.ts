import { Body, Controller, Param, Patch } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Controller('admin/projects')
export class AdminProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch(':id/handover-notes')
  async updateHandoverNotes(
    @Param('id') id: string,
    @Body() payload: { handoverNotes?: string | null },
  ) {
    const notes =
      payload.handoverNotes && payload.handoverNotes.trim().length
        ? payload.handoverNotes.trim()
        : null;

    const project = await this.prisma.project.update({
      where: { id },
      data: { handoverNotes: notes },
    });

    return {
      id: project.id,
      handoverNotes: project.handoverNotes,
    };
  }
}

