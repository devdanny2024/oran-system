export class CreateProjectDto {
  name!: string;
  userId!: string;
  buildingType?: string;
  roomsCount?: number;
}
