import { Repository } from 'typeorm';
import { Resident } from '../../../../domain/resident/resident.entity';
import { IResidentRepository } from '../../../../domain/resident/resident.repository';
import { ResidentOrmEntity } from '../entities/resident.orm-entity';
export declare class ResidentTypeOrmRepository implements IResidentRepository {
    private readonly repo;
    constructor(repo: Repository<ResidentOrmEntity>);
    findAll(): Promise<Resident[]>;
    findById(id: string): Promise<Resident | null>;
    save(resident: Partial<Resident>): Promise<Resident>;
    findByEmail(email: string): Promise<Resident | null>;
    findByTelephone(telephone: string): Promise<Resident | null>;
    findByClerkUserId(clerkUserId: string): Promise<Resident | null>;
    delete(id: string): Promise<void>;
    private toDomain;
}
