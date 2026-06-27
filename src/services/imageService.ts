/**
 * 图片识别服务
 * 在渲染进程中使用 tesseract.js，所有资源（worker、core、lang）从 CDN 加载
 * 彻底避免 Electron 打包后本地 worker 路径找不到的问题
 */

// tesseract.js CDN 资源路径
const TESSERACT_CDN = {
  workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js',
  corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
  langPath: 'https://tessdata.projectnaptha.com/4.0.0',
}

let workerPromise: Promise<any> | null = null

/**
 * 获取或创建 Tesseract worker（复用避免重复初始化）
 */
async function getWorker(onProgress?: (status: string, progress: number) => void): Promise<any> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
        workerPath: TESSERACT_CDN.workerPath,
        corePath: TESSERACT_CDN.corePath,
        langPath: TESSERACT_CDN.langPath,
        workerBlobURL: true,
        logger: (m: any) => {
          if (onProgress && m.status) {
            onProgress(m.status, m.progress || 0)
          }
        },
      })
      return worker
    })()
  }
  return workerPromise
}

/**
 * 从图片中识别文字
 * @param input Blob、File、ArrayBuffer 或 data URL
 * @param onProgress 进度回调
 * @returns 识别出的文字内容
 */
export async function recognizeImageText(
  input: Blob | File | ArrayBuffer | string,
  onProgress?: (status: string, progress: number) => void,
): Promise<string> {
  // 60 秒超时
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('图片识别超时（60秒），请检查网络连接后重试'))
    }, 60000)
  })

  try {
    const worker = await getWorker(onProgress)

    // 如果是 ArrayBuffer，转为 Blob
    let imageData: Blob | File | string = input
    if (input instanceof ArrayBuffer) {
      imageData = new Blob([input])
    }

    const recognizePromise = worker.recognize(imageData)
    const result = await Promise.race([recognizePromise, timeoutPromise])
    return (result as any).data.text.trim()
  } catch (err) {
    // 如果 worker 出错，重置以便下次重新创建
    workerPromise = null
    throw new Error(`图片识别失败: ${err instanceof Error ? err.message : '未知错误'}`)
  }
}

/**
 * 将图片文件转为 Base64 data URL（用于在 UI 中预览）
 */
export function fileToDataURL(file: File | ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    if (file instanceof File) {
      reader.readAsDataURL(file)
    } else {
      const blob = new Blob([file])
      reader.readAsDataURL(blob)
    }
  })
}

/**
 * 从图片文件路径读取为 ArrayBuffer（Electron 环境）
 */
export async function readImageFromPath(filePath: string): Promise<ArrayBuffer> {
  if (window.electronAPI?.readFileBuffer) {
    return window.electronAPI.readFileBuffer(filePath)
  }
  throw new Error('无法读取文件，文件 API 不可用')
}
