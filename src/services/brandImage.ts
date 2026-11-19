const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_DATA_LENGTH = 120_000

export async function prepareBrandImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_FILE_BYTES) {
    throw new Error('Escolha uma imagem PNG, JPG ou WebP de até 10 MB.')
  }

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => { throw new Error('Não foi possível ler a imagem. Confira se o arquivo está íntegro.') })
    const scale = Math.min(1, 480 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('A edição de imagem está indisponível neste navegador.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const png = canvas.toDataURL('image/png')
    if (png.length <= MAX_DATA_LENGTH) return png
    context.globalCompositeOperation = 'destination-over'
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    const jpeg = canvas.toDataURL('image/jpeg', 0.8)
    if (jpeg.length <= MAX_DATA_LENGTH) return jpeg
    const compressed = canvas.toDataURL('image/jpeg', 0.5)
    if (compressed.length <= MAX_DATA_LENGTH) return compressed
    throw new Error('A imagem ficou grande após a compactação. Escolha um arquivo menor.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
