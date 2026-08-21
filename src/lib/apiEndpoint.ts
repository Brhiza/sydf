const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/$/, '') || '';

export function apiEndpoint(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return configuredApiOrigin ? `${configuredApiOrigin}${normalizedPath}` : normalizedPath;
}
