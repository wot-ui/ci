export function normalizeBase(value = '/') {
  if (!/^\/(?:[\w-]+\/)*$/.test(value))
    throw new Error('SITE_BASE must be a path such as / or /ci/')
  return value
}
