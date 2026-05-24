function tryExtract(url: string): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 50
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve({ r: 200, g: 40, b: 50 }); return }
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data

        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const red = data[i], green = data[i + 1], blue = data[i + 2]
          const total = red + green + blue
          if (total < 80 || total > 680) continue
          r += red; g += green; b += blue; count++
        }

        if (count === 0) { resolve({ r: 200, g: 40, b: 50 }); return }
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const delta = max - min
        if (delta < 30) {
          const boost = 1.3
          r = Math.min(255, Math.round(max + (r - max) * boost))
          g = Math.min(255, Math.round(max + (g - max) * boost))
          b = Math.min(255, Math.round(max + (b - max) * boost))
        }

        resolve({ r, g, b })
      } catch {
        resolve({ r: 200, g: 40, b: 50 })
      }
    }
    img.onerror = () => resolve({ r: 200, g: 40, b: 50 })
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

const API_BASE = 'http://localhost:3000'

export function extractDominantColor(imageUrl: string): Promise<{ r: number; g: number; b: number }> {
  // Try direct URL first, fall back to server proxy if CORS blocks Canvas
  return tryExtract(imageUrl).then(color => {
    // If we got the fallback red, it likely means CORS blocked us — try proxy
    if (color.r === 200 && color.g === 40 && color.b === 50 && imageUrl.startsWith('http')) {
      const proxyUrl = `${API_BASE}/api/proxy/${encodeURIComponent(imageUrl)}`
      return tryExtract(proxyUrl)
    }
    return color
  })
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

export function rgbToString(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r},${g},${b},${a})`
}
