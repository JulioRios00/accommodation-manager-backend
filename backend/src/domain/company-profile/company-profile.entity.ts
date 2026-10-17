/** Branding shown in the app shell. A single row — there is one profile per deployment. */
export class CompanyProfile {
  /** Fixed primary key; see COMPANY_PROFILE_ID. */
  id: string;
  appName: string;
  /** `data:image/...;base64,...`, or null for no logo. Stored inline rather than in
   *  object storage: there is no bucket in this stack and a sidebar logo is tiny. */
  logoDataUrl: string | null;
  updatedAt: Date;
}

export const COMPANY_PROFILE_ID = 'default';
export const DEFAULT_APP_NAME = 'AccomManager';

/** Keeps the row (and so the request body) comfortably inside Postgres and Nest's
 *  default body limit. A base64 data URL is ~4/3 the size of the raw image. */
export const MAX_LOGO_DATA_URL_LENGTH = 512 * 1024;

export const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'] as const;

/** A data URL whose declared type is one we accept. Guards against someone storing a
 *  script or an arbitrary remote URL that the shell would then render. */
export function isAllowedLogoDataUrl(value: string): boolean {
  const match = /^data:([a-z+/-]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value.trim());
  if (!match) return false;
  return (ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(match[1].toLowerCase());
}
