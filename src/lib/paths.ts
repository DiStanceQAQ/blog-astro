const configuredBase = import.meta.env.BASE_URL || '/';

export const BASE_PATH = configuredBase === '/'
  ? ''
  : `/${configuredBase.replace(/^\/|\/$/g, '')}`;

export function withBase(path: string) {
  if (
    !path
    || path.startsWith('#')
    || path.startsWith('//')
    || /^[a-z][a-z\d+.-]*:/i.test(path)
  ) {
    return path;
  }

  if (
    BASE_PATH
    && (
      path === BASE_PATH
      || path.startsWith(`${BASE_PATH}/`)
      || path.startsWith(`${BASE_PATH}#`)
    )
  ) {
    return path;
  }

  if (path === '/') {
    return BASE_PATH ? `${BASE_PATH}/` : '/';
  }

  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
