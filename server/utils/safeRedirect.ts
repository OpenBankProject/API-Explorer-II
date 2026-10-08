// A page of API Explorer II to send the browser to after login or logoff, taken from the
// ?redirect= query param. Only a path on this site is allowed, so a crafted link such as
// /api/oauth2/connect?redirect=https://evil.example cannot send someone to another site after they
// log in (an open redirect). "//host" and "/\host" are rejected too, because browsers read both as
// another host. The front end only ever sends paths like /resource-docs/OBPv7.0.0?operationid=...
export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/')) return undefined
  if (value.startsWith('//') || value.includes('\\')) return undefined
  // Control characters (tab, newline...) are stripped by browsers, so "/\t/evil.example" would become "//evil.example".
  if (/[\u0000-\u001f\u007f]/.test(value)) return undefined
  return value
}
