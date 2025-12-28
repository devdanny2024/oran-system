import { IsString } from 'class-validator';

export class GenerateQuotesDto {
  @IsString()
  projectId!: string;
}

