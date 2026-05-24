import fs from 'fs'
import path from 'path'

interface PlatformConfig {
  neteaseCookie: string
  kugouCookie: string
}

const CONFIG_PATH = path.join(__dirname, '..', '..', 'platform_config.json')

let config: PlatformConfig = { neteaseCookie: '', kugouCookie: '' }

function load(): PlatformConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
      config = { ...config, ...JSON.parse(raw) }
    }
  } catch { /* keep defaults */ }
  return config
}

function save(): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
  } catch { /* non-critical */ }
}

export function getConfig(): PlatformConfig {
  return { ...config }
}

export function updateConfig(partial: Partial<PlatformConfig>): PlatformConfig {
  if (partial.neteaseCookie !== undefined) config.neteaseCookie = partial.neteaseCookie
  if (partial.kugouCookie !== undefined) config.kugouCookie = partial.kugouCookie
  save()
  return { ...config }
}

// Load on startup
load()
