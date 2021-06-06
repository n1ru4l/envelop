export function getPathname(path?: string): string | undefined {
  return path && new URL('http://_' + path).pathname;
}
