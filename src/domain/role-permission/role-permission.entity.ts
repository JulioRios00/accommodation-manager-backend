import { UserRole } from '../types/role';

/** Access level a role has over an application section. */
export type AccessLevel = 'Full' | 'View+Edit' | 'View' | 'None';

export const ACCESS_LEVELS: AccessLevel[] = ['Full', 'View+Edit', 'View', 'None'];

/** Sections the permission matrix is defined over. Must match the frontend list. */
export const SECTIONS = [
  'Dashboard',
  'Properties',
  'Beds',
  'Residents',
  'Bookings',
  'Landlords',
  'Service Providers',
  'Maintenance',
  'Key Log',
  'Payments',
  'Reports',
  'Companies',
  'Import Data',
  'User Management',
] as const;

export type Section = (typeof SECTIONS)[number];

export class RolePermission {
  id: string;
  role: UserRole;
  section: Section;
  level: AccessLevel;
  updatedAt: Date;
}
