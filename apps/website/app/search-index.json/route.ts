import { searchIndex } from '../../lib/documents'

export const dynamic = 'force-static'

export function GET() {
  return Response.json(searchIndex)
}
