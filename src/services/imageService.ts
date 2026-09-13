/**
 * 图片工具服务
 * 把用户选择的图片规范化为模型可接受的内联格式后再发送。
 *
 * 为什么必须规范化：多模态接口只接受 webp / png / jpeg / gif，
 * 而用户可能选到 BMP、TIFF、HEIC 等格式；另外 Electron 路径拿到的是
 * ArrayBuffer（没有 MIME），直接转 data URL 会退化成
 * `data:application/octet-stream`，同样会被接口拒绝。
 * 因此这里统一解码后重新编码为 PNG（必要时降级为 JPEG），并顺带压缩尺寸。
 */
import { translate, type TranslationKey } from '../i18n'
import { useLanguageStore } from '@stores/languageStore'

/** 模型明确支持的图片格式 */
const SUPPORTED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

/** 规范化后 data URL 的字符上限（约 4MB 二进制），超出则继续压缩 */
const MAX_DATA_URL_CHARS = 5_500_000

/** 长边逐步收紧的候选尺寸 */
const SIZE_STEPS = [1600, 1280, 1024, 768]

function imgError(key: TranslationKey): Error {
  return new Error(translate(useLanguageStore.getState().language, key))
}

/** 通过文件头识别真实图片类型（识别不出返回 null） */
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif'
  }
  if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp'
  }
  return null
}

/** 由扩展名推断 MIME（Electron 打开文件时可拿到路径） */
export function mimeFromExtension(extOrPath: string): string | undefined {
  const ext = extOrPath.toLowerCase().split('.').pop() ?? ''
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    jpe: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    heic: 'image/heic',
    heif: 'image/heif',
    avif: 'image/avif',
    svg: 'image/svg+xml',
  }
  return map[ext]
}

/** 归一为带正确 MIME 的 Blob */
async function toTypedBlob(input: File | ArrayBuffer, mimeHint?: string): Promise<Blob> {
  if (input instanceof ArrayBuffer) {
    const bytes = new Uint8Array(input)
    const mime = sniffMime(bytes) ?? mimeHint ?? 'application/octet-stream'
    return new Blob([bytes], { type: mime })
  }
  if (input.type) return input
  const sniffed = sniffMime(new Uint8Array(await input.arrayBuffer()))
  return sniffed ? new Blob([input], { type: sniffed }) : input
}

/** 解码图片（失败则抛错，交给调用方提示用户） */
async function decodeImage(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(blob)
    }
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(imgError('img.invalidFormat'))
      }
      img.src = url
    })
  } catch {
    throw imgError('img.invalidFormat')
  }
}

/** 按最长边限制缩放并重新编码为 data URL */
function encodeScaled(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number,
  format: 'image/png' | 'image/jpeg',
): { dataUrl: string; width: number; height: number } {
  const sw = source.width
  const sh = source.height
  const scale = Math.min(1, maxSide / Math.max(sw, sh))
  const width = Math.max(1, Math.round(sw * scale))
  const height = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw imgError('img.invalidFormat')

  // JPEG 无透明通道，先铺白底避免透明区域变黑
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height)
  return { dataUrl: canvas.toDataURL(format, 0.88), width, height }
}

/**
 * 把图片规范化为可安全发送给多模态模型的 data URL
 * 无论输入是 File 还是 ArrayBuffer（含缺失 MIME 的情况），输出一定是
 * `data:image/png;base64,...` 或 `data:image/jpeg;base64,...`
 */
export async function prepareImageForModel(
  input: File | ArrayBuffer,
  mimeHint?: string,
): Promise<string> {
  const blob = await toTypedBlob(input, mimeHint)
  const source = await decodeImage(blob)

  try {
    const originalMime = input instanceof File ? input.type : mimeHint ?? blob.type
    // 本身就在支持列表内、且体积不大时，直接原样内联（避免无意义的重新编码）
    if (SUPPORTED_MIME.has(originalMime) && blob.size <= 3_500_000) {
      const raw = await blobToDataURL(blob)
      if (raw.length <= MAX_DATA_URL_CHARS) return raw
    }

    for (const step of SIZE_STEPS) {
      const { dataUrl } = encodeScaled(source, step, 'image/png')
      if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl
    }
    // PNG 仍过大（多为照片）：降级为 JPEG 白底
    for (const step of SIZE_STEPS) {
      const { dataUrl } = encodeScaled(source, step, 'image/jpeg')
      if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl
    }
    throw imgError('img.tooLarge')
  } finally {
    if ('close' in source && typeof source.close === 'function') source.close()
  }
}

/** Blob → data URL */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** 把 File / ArrayBuffer 转为 data URL（用于在 UI 中预览） */
export function fileToDataURL(file: File | ArrayBuffer): Promise<string> {
  if (file instanceof File) return blobToDataURL(file)
  return blobToDataURL(new Blob([file]))
}
