export class StartOnboardingDto {
  projectId!: string;
  projectStatus?: string;
  constructionStage?: string;
  needsInspection?: boolean;
  selectedFeatures?: string[];
  stairSteps?: number;
  siteAddress?: string;
  contactPhone?: string;
}
