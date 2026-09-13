/**
 * 图片工具服务
 * 只负责把本地图片转成 data URL；图片内容本身由多模态模型直接解析，
 * 不再需要本地 OCR 引擎（原 tesseract.js 链路已移除）
 */

/** 把 File / ArrayBuffer 转为 data URL（用于在 UI 中预览，并随消息发给模型） */
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
