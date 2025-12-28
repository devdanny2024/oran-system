import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { Response } from 'express';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Res } from '@nestjs/common';

@Controller('projects/:projectId/agreements')
export class AgreementsController {
  constructor(
    private readonly agreementsService: AgreementsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@Param('projectId') projectId: string) {
    return this.agreementsService.listForProject(projectId);
  }

  @Post(':agreementId/accept')
  async accept(
    @Param('projectId') projectId: string,
    @Param('agreementId') agreementId: string,
    @Body() body: { userId: string },
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.agreementsService.acceptAgreement({
      projectId,
      agreementId,
      userId: body.userId,
      userAgent,
    });
  }

  @Get(':agreementId/pdf')
  async pdf(
    @Param('projectId') projectId: string,
    @Param('agreementId') agreementId: string,
    @Res() res: Response,
  ) {
    const agreement = await (this.prisma as any).projectAgreement.findFirst({
      where: { id: agreementId, projectId },
    });

    if (!agreement) {
      res.status(404).send('Agreement not found');
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${agreement.title || 'agreement'}.pdf"`,
    );

    const doc = new (PDFDocument as any)({
      size: 'A4',
      margin: 50,
    });

    doc.pipe(res);

    doc
      .fontSize(16)
      .text('ORAN Smart Home', { align: 'left' })
      .moveDown(0.5);
    doc
      .fontSize(12)
      .fillColor('#555555')
      .text('Project Agreement', { align: 'left' })
      .moveDown(1.5)
      .fillColor('#000000');

    doc.fontSize(14).text(agreement.title, { align: 'left' }).moveDown(1);

    doc.fontSize(11).text(agreement.content, {
      align: 'left',
      lineGap: 4,
    });

    doc.moveDown(2);
    doc
      .fontSize(11)
      .text('ORAN Signature', { underline: true })
      .moveDown(0.5);
    doc.text('Tayo Balogun');
    doc.text('Chief Executive Officer, ORAN');

    if (agreement.acceptedAt) {
      doc.moveDown(2);
      doc.fontSize(11).text('Customer Acceptance', { underline: true });
      doc.moveDown(0.5);
      doc.text(`Accepted at: ${agreement.acceptedAt.toISOString()}`);
      if (agreement.acceptedDeviceSignature) {
        const fingerprint = agreement.acceptedDeviceSignature.slice(-8);
        doc.text(`Device signature: ****${fingerprint}`);
      }
    }

    doc.end();
  }
}

