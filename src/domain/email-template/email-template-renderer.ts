import { EMAIL_TEMPLATE_VARIABLES } from './email-template.entity';

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

/** All `{{variable}}` tokens referenced in a string, in first-appearance order (deduped). */
export function extractVariables(text: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE);
  while ((match = re.exec(text))) found.add(match[1]);
  return [...found];
}

/** Names referenced in `text` that aren't in the supported variable whitelist — empty when
 *  the template is valid. Used server-side to reject a save, and by the frontend preview to
 *  show the same validation without a round-trip. */
export function unsupportedVariables(text: string): string[] {
  return extractVariables(text).filter((v) => !(EMAIL_TEMPLATE_VARIABLES as readonly string[]).includes(v));
}

/** Substitutes `{{variable}}` tokens with the given values. Unknown tokens are left as-is
 *  (shouldn't occur — save-time validation already rejects them) rather than silently dropped,
 *  so a bug here fails loudly instead of sending a resident a blank-looking email. */
export function renderTemplate(text: string, values: Record<string, string>): string {
  return text.replace(PLACEHOLDER_RE, (full, name) => (name in values ? values[name] : full));
}
