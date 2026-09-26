export class SavedReport {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  fieldMetadata: any;
  createdBy: string;
  createdByName: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
