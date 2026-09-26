import { Repository } from 'typeorm';
import { Property } from '../../../../domain/property/property.entity';
import { IPropertyRepository } from '../../../../domain/property/property.repository';
import { PropertyOrmEntity } from '../entities/property.orm-entity';
export declare class PropertyTypeOrmRepository implements IPropertyRepository {
    private readonly repo;
    constructor(repo: Repository<PropertyOrmEntity>);
    findAll(includeInactive?: boolean): Promise<Property[]>;
    findById(id: string): Promise<Property | null>;
    findByIdAnyStatus(id: string): Promise<Property | null>;
    findByCode(code: string): Promise<Property | null>;
    findByMprn(mprn: string): Promise<Property | null>;
    findByGprn(gprn: string): Promise<Property | null>;
    save(property: Partial<Property>): Promise<Property>;
    delete(id: string): Promise<void>;
    upsertByCode(property: Partial<Property>): Promise<Property>;
    findByCodeAnyStatus(code: string): Promise<Property | null>;
    private toDomain;
}
