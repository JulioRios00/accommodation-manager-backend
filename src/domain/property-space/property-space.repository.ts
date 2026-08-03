import { PropertySpace, SpaceItem } from './property-space.entity';

export interface IPropertySpaceRepository {
  findAll(propertyId?: string): Promise<PropertySpace[]>;
  findById(id: string): Promise<PropertySpace | null>;
  save(space: Partial<PropertySpace>): Promise<PropertySpace>;
  delete(id: string): Promise<void>;
}

export interface ISpaceItemRepository {
  findBySpaceId(spaceId: string): Promise<SpaceItem[]>;
  findById(id: string): Promise<SpaceItem | null>;
  save(item: Partial<SpaceItem>): Promise<SpaceItem>;
  delete(id: string): Promise<void>;
  deleteBySpaceId(spaceId: string): Promise<void>;
}

export const PROPERTY_SPACE_REPOSITORY = 'PROPERTY_SPACE_REPOSITORY';
export const SPACE_ITEM_REPOSITORY = 'SPACE_ITEM_REPOSITORY';
