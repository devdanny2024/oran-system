import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { InviteTechnicianDto } from './dto/invite-technician.dto';
import { RevokeTechnicianDto } from './dto/revoke-technician.dto';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Post('trips')
  createTrip(@Body() payload: CreateTripDto) {
    return this.operationsService.createTrip(payload);
  }

  @Get('trips')
  listTrips(
    @Query('technicianId') technicianId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.operationsService.listTrips({ technicianId, projectId });
  }

  @Get('technicians')
  listTechnicians() {
    return this.operationsService.listTechnicians();
  }

  @Post('technicians/invite')
  inviteTechnician(@Body() payload: InviteTechnicianDto) {
    return this.operationsService.inviteTechnician(payload);
  }

  @Post('technicians/revoke')
  revokeTechnicianInvite(@Body() payload: RevokeTechnicianDto) {
    return this.operationsService.revokeTechnicianInvite(payload);
  }

  @Patch('trips/:id/check-in')
  checkIn(@Param('id') id: string) {
    return this.operationsService.checkIn(id);
  }

  @Patch('trips/:id/check-out')
  checkOut(@Param('id') id: string) {
    return this.operationsService.checkOut(id);
  }

  @Patch('trips/:id/reschedule')
  reschedule(
    @Param('id') id: string,
    @Body() body: { scheduledFor: string },
  ) {
    const date = new Date(body.scheduledFor);
    return this.operationsService.rescheduleTrip(id, date);
  }

  @Patch('trips/:id/reopen')
  reopen(
    @Param('id') id: string,
    @Body() body: { resetTasks?: boolean; reason?: string },
  ) {
    const resetTasks = Boolean(body?.resetTasks);
    const reason = body?.reason;
    return this.operationsService.reopenTrip(id, resetTasks, reason);
  }

  @Get('trips/:id/tasks')
  listTasks(@Param('id') id: string) {
    return this.operationsService.listTasks(id);
  }

  @Patch('trips/:id/tasks/:taskId')
  updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: { isDone: boolean },
  ) {
    return this.operationsService.updateTaskStatus(id, taskId, body.isDone);
  }

  @Post('trips/:id/photos')
  addPhoto(
    @Param('id') id: string,
    @Body() body: { url: string; caption?: string | null },
  ) {
    return this.operationsService.addPhoto(id, body.url, body.caption);
  }

  @Get('projects/:projectId/work-progress')
  getWorkProgress(@Param('projectId') projectId: string) {
    return this.operationsService.getWorkProgress(projectId);
  }

  @Patch('projects/:projectId/work-progress')
  updateWorkProgress(
    @Param('projectId') projectId: string,
    @Body() body: { items: { quoteItemId: string; installed: number }[] },
  ) {
    return this.operationsService.updateWorkProgress(projectId, body);
  }

  @Get('customers/search')
  searchCustomers(@Query('q') query: string) {
    return this.operationsService.searchCustomers(query ?? '');
  }

  @Post('inspection-quotes')
  createInspectionQuote(
    @Body()
    body: {
      email: string;
      items: { productId: string; quantity: number }[];
      projectName?: string;
      buildingType?: string | null;
      roomsCount?: number | null;
    },
  ) {
    return this.operationsService.createInspectionQuote(body);
  }
}
