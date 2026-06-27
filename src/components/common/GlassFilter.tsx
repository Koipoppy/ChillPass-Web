/**
 * 液态玻璃 SVG 滤镜定义
 * 必须在 App 根节点渲染，供所有 .liquid-glass 元素引用
 */
export default function GlassFilter() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <filter id="liquidGlassRefraction" x="-20%" y="-20%" width="140%" height="140%">
          {/* 1. 生成低频有机噪波 */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="2"
            seed="3"
            result="noise"
          />
          {/* 2. 位移映射：光线折射 */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="12"
            xChannelSelector="R"
            yChannelSelector="G"
            result="refracted"
          />
          {/* 3. 高斯模糊 */}
          <feGaussianBlur in="refracted" stdDeviation="0.5" result="blurred" />
          {/* 4. 镜面高光 */}
          <feSpecularLighting
            in="noise"
            surfaceScale="2"
            specularConstant="0.6"
            specularExponent="20"
            lightingColor="#ffffff"
            result="specular"
          >
            <feDistantLight azimuth="225" elevation="55" />
          </feSpecularLighting>
          {/* 5. 合成 */}
          <feComposite
            in="specular"
            in2="blurred"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="lit"
          />
          <feComposite in="lit" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  )
}
