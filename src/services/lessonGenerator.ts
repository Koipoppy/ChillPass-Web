import { generateLessonContent } from './deepseek'
import { useCourseStore } from '@stores/courseStore'

/**
 * 在后台为课程的所有关卡生成学习内容
 * 逐个生成，避免 API 限流
 */
export async function generateAllLessonsInBackground(courseId: string): Promise<void> {
  const store = useCourseStore.getState()
  const bundle = store.courses.find(b => b.course.id === courseId)
  if (!bundle || bundle.lessons.length === 0) return

  const { lessons, examPoints, rawText } = bundle
  const total = lessons.length

  store.setGeneratingLessons(true, { current: 0, total })

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i]
    const examPoint = examPoints.find(p => p.id === lesson.examPointId)
    if (!examPoint) continue

    // 如果已经有内容，跳过
    if (lesson.content) continue

    try {
      const content = await generateLessonContent(examPoint, rawText)
      // 使用最新的 store 状态来设置内容
      useCourseStore.getState().setLessonContent(lesson.id, content)
    } catch (error) {
      // 单个关卡生成失败不影响其他关卡
      console.error(`关卡 "${lesson.title}" 内容生成失败:`, error)
    }

    // 更新进度
    useCourseStore.getState().setGeneratingLessons(true, { current: i + 1, total })
  }

  useCourseStore.getState().setGeneratingLessons(false)
}
