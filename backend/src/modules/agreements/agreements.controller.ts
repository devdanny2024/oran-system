import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
// Use a loose type for the Express response to avoid hard dependency on types.
type ExpressResponse = any;
import PDFDocument = require('pdfkit');
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AgreementType } from '@prisma/client';

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

  @Post('ensure')
  async ensure(@Param('projectId') projectId: string) {
    const agreements =
      await this.agreementsService.createForProjectIfMissing(projectId);
    return { items: agreements };
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
    @Res() res: ExpressResponse,
  ) {
    const agreement = await (this.prisma as any).projectAgreement.findFirst({
      where: { id: agreementId, projectId },
    });

    if (!agreement) {
      res.status(404).send('Agreement not found');
      return;
    }

    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      include: { user: true },
    });

    const customerName =
      project?.user?.name && project.user.name.trim().length > 0
        ? project.user.name
        : project?.user?.email ?? 'Customer';

    const address = project?.onboarding?.siteAddress ?? 'Not provided';
    const baseContext = `Customer: ${customerName}\nProject: ${project?.name ?? 'ORAN Project'}\nAddress: ${address}\nRooms: ${project?.roomsCount ?? 'N/A'}`;

    let content = agreement.content as string;

    // Regenerate content on the fly so PDFs always use the
    // latest rich templates, even if the stored content is older.
    if (agreement.type === AgreementType.MAINTENANCE) {
      content = [
        'Installation & Maintenance Agreement',
        '',
        baseContext,
        '',
        '1. Scope of installation',
        'ORAN will provide design review, low‑voltage wiring guidance, device mounting, configuration, testing and handover of the agreed smart home automation system for this project.',
        'Installation covers only the devices and services listed in the approved ORAN quote and any written variations agreed later.',
        '',
        '2. Responsibilities on site',
        'The customer is responsible for providing safe access to the site, a clean working environment, stable power, internet connectivity and any required builder or landlord permissions.',
        'ORAN technicians will follow reasonable site rules and will take care to avoid damage to finished surfaces. Any pre‑existing issues or third‑party works remain the responsibility of the customer and/or their contractors.',
        '',
        '3. Variations and additional work',
        'If the customer requests changes after work has begun (extra rooms, devices, or re‑routing of cabling), ORAN will document the variation and associated cost before proceeding.',
        'Variation amounts may be invoiced separately or added to the remaining project milestones.',
        '',
        '4. Maintenance and support',
        'After handover, ORAN will provide remote support for configuration issues and minor adjustments within the first 30 days at no additional charge.',
        'Ongoing maintenance or site visits beyond this window may be billed according to ORAN’s current maintenance rates unless covered by a separate maintenance plan.',
        '',
        '5. Access to equipment and software',
        'ORAN may temporarily access controllers, apps and cloud services to commission and support the system.',
        'Administrative logins, configuration files and documentation will be handed over on completion, except for any proprietary tools ORAN uses internally.',
      ].join('\n');
    } else if (agreement.type === AgreementType.SCOPE_OF_WORK) {
      content = [
        'Scope of Work & Product Schedule',
        '',
        baseContext,
        '',
        '1. Included systems',
        'The project includes only the automation categories, devices and quantities listed in your approved ORAN quote and confirmed during onboarding.',
        'Examples may include lighting control, climate control, access control, surveillance, gate automation and staircase lighting.',
        '',
        '2. Product schedule',
        'The detailed bill of materials (devices, quantities and unit prices) is contained in your selected quote and any agreed variations.',
        'If a specified product becomes unavailable, ORAN may substitute an equivalent or better model after discussing the change with the customer. Any material differences in functionality or price will be agreed in writing.',
        '',
        '3. Exclusions',
        'Civil works, major electrical distribution changes, painting, carpentry, false ceilings and network cabling beyond what is specified in the quote are excluded unless explicitly listed as line items.',
        'Third‑party services such as internet service, security monitoring or streaming subscriptions are not part of this agreement.',
        '',
        '4. Handover',
        'On completion, ORAN will walk the customer through the system, demonstrate key use cases, and provide basic training on apps, scenes and schedules.',
        'Any punch‑list items identified during handover will be documented and scheduled for resolution within a reasonable timeframe.',
      ].join('\n');
    } else if (agreement.type === AgreementType.PAYMENT_TERMS) {
      content = [
        'Payment, Warranty & Cancellation Terms',
        '',
        baseContext,
        '',
        '1. Payment structure',
        'Payments for this project will follow the payment style selected inside the ORAN dashboard (for example, 3 milestones or an 80 / 10 / 10 plan).',
        'Invoices will be issued for each milestone and are due upon receipt unless otherwise stated. Work may pause if invoices remain unpaid beyond the agreed terms.',
        '',
        '2. Warranty',
        'ORAN will honour manufacturer warranties on supplied hardware and will provide a workmanship warranty on installation for a period communicated in your quote or onboarding summary.',
        'Warranty does not cover misuse, unauthorised modifications, damage caused by other contractors, power issues, lightning, or network/internet outages.',
        '',
        '3. Cancellation and rescheduling',
        'If the customer cancels the project after equipment has been ordered, ORAN may charge for restocking fees or any non‑returnable items already supplied.',
        'Site visits that are cancelled or rescheduled with less than 24 hours notice may incur a call‑out fee to cover technician time and logistics.',
        '',
        '4. Logistics and travel',
        'Where the project site is outside Lagos, additional logistics and travel costs may apply, as reflected in your quote. These cover round‑trip transport for technicians and essential equipment.',
        '',
        '5. Governing law',
        'This agreement is governed by the laws of the Federal Republic of Nigeria. Any disputes will be handled in good faith, with both parties first attempting to resolve issues informally before escalating further.',
      ].join('\n');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${agreement.title || 'agreement'}.pdf"`,
    );

    const doc = new PDFDocument({
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
      .text('Project Agreement v2', { align: 'left' })
      .moveDown(1.5)
      .fillColor('#000000');

    doc.fontSize(14).text(agreement.title, { align: 'left' }).moveDown(1);

    doc.fontSize(11).text(content, {
      align: 'left',
      lineGap: 4,
    });

    doc.moveDown(1.5);
    doc.fontSize(11).text('Customer', { underline: true }).moveDown(0.5);
    doc.text(`Name: ${customerName}`);
    if (project?.user?.email) {
      doc.text(`Email: ${project.user.email}`);
    }

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
