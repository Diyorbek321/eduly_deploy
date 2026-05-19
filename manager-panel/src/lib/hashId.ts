const SALT = 'eduly_v1_';

export function encodeId(id: string | number): string {
  const raw = SALT + String(id);
  const b64 = typeof window !== 'undefined' ? window.btoa(raw) : Buffer.from(raw).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeId(hash: string): string {
  try {
    const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4);
    const raw = typeof window !== 'undefined' ? window.atob(padded) : Buffer.from(padded, 'base64').toString();
    return raw.startsWith(SALT) ? raw.slice(SALT.length) : hash;
  } catch {
    return hash;
  }
}
