import { rm } from 'node:fs/promises'

// Build caches are not deployment artifacts; align with OpenWot's Next build.
await rm(new URL('../.next/cache/', import.meta.url), { recursive: true, force: true })
