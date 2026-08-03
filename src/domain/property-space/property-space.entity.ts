export type SpaceCategory =
  | 'bedroom' | 'kitchen' | 'bathroom' | 'living_room' | 'dining_room'
  | 'garden' | 'storage' | 'office' | 'utility' | 'other';

export class PropertySpace {
  id: string;
  propertyId: string;
  category: SpaceCategory;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: SpaceItem[];
}

export class SpaceItem {
  id: string;
  spaceId: string;
  name: string;
  quantity: number;
  condition: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
