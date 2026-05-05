import { API_URL } from '../services/api';

export const isAbsoluteUrl = (value = '') =>
  typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));

export const requiresProtectedAccess = (value = '') =>
  typeof value === 'string' &&
  (value.startsWith('cld-private://') || /^(\/)?uploads[\\/]/i.test(value));

export const buildProtectedFileUrl = (clientId, fileRef, downloadName = '') => {
  if (!clientId || !fileRef) return '';

  const params = new URLSearchParams({ fileRef });
  if (downloadName) params.set('downloadName', downloadName);
  return `${API_URL}/api/client/${clientId}/file-access?${params.toString()}`;
};

export const resolveClientFileUrl = (clientId, value = '') => {
  if (!value) return '';
  if (value.startsWith('blob:')) return value;
  if (isAbsoluteUrl(value)) return value;
  if (requiresProtectedAccess(value)) return buildProtectedFileUrl(clientId, value);

  try {
    return new URL(value, API_URL).toString();
  } catch {
    return value;
  }
};
