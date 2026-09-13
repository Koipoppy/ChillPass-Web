import { useState } from 'react'
import Sidebar from '../Sidebar'

/**
 * 底部 dock 左区：折叠状态的侧边栏
 *
 * 展开时是同一张卡片原地向上长高（宽度不变、不额外弹层），
 * 长出来的空间里铺开课程管理与进度信息。
 */
export default function SidebarRail() {
  const [expanded, setExpanded] = useState(false)

  return (
    <Sidebar
      variant="rail"
      expanded={expanded}
      onToggleExpand={() => setExpanded(v => !v)}
    />
  )
}
