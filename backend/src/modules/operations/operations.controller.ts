import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { InviteTechnicianDto } from './dto/invite-technician.dto';

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

  @Patch('trips/:id/check-in')
  checkIn(@Param('id') id: string) {
    return this.operationsService.checkIn(id);
  }

  @Patch('trips/:id/check-out')
  checkOut(@Param('id') id: string) {
    return this.operationsService.checkOut(id);
  }
}
