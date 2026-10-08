import { Container } from 'typedi'
import OBPClientService from './OBPClientService.js'
import { PublicDocsCache } from '../utils/publicDocsCache.js'

// The one cache of public documentation, shared by the docs proxy (routes/obp.ts) and the status
// checks (routes/status.ts), so checking status never fetches docs the Explorer already holds.
export const publicDocsCache = new PublicDocsCache((path) =>
  Container.get(OBPClientService).getWithoutAuth(path)
)
