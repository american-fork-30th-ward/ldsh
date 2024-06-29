import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sensitive = path.join(__dirname, '../../sensitive')

export default {
  sensitiveDir: sensitive,
  dataFolder: path.join(sensitive, 'out'),
}
