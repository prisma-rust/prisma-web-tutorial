import { mountFrameLoop } from './frameLoop'

export type VizKey =
  | 'frameLoop'
  | 'clock'
  | 'ecs'
  | 'assetPipeline'
  | 'eventFlow'
  | 'frameGraph'
  | 'renderGraph'
  | 'extract'
  | 'editor'
  | 'architecture'

type Mount = (host: HTMLElement) => () => void

const unimplemented = (label: string): Mount => (host) => {
  host.classList.add('viz', 'viz-soon')
  host.innerHTML = `<p>「${label}」的可视化还在施工中。先读代码，图会来的。</p>`
  return () => {
    host.innerHTML = ''
  }
}

const REGISTRY: Record<VizKey, Mount> = {
  frameLoop: mountFrameLoop,
  clock: mountFrameLoop,
  ecs: unimplemented('ECS 稀疏集'),
  assetPipeline: unimplemented('资源烘焙管线'),
  eventFlow: unimplemented('事件流'),
  frameGraph: unimplemented('帧图'),
  renderGraph: unimplemented('RenderGraph'),
  extract: unimplemented('渲染提取'),
  editor: unimplemented('编辑器'),
  architecture: unimplemented('引擎全景'),
}

export function mountViz(key: string, host: HTMLElement): () => void {
  const mount = REGISTRY[key as VizKey]
  if (!mount) return unimplemented(key)(host)

  const caption = document.createElement('figcaption')
  caption.className = 'viz-cap'
  caption.textContent = VIZ_CAPTIONS[key] ?? ''
  host.appendChild(caption)

  const stage = document.createElement('div')
  stage.className = 'viz-stage'
  host.appendChild(stage)

  const dispose = mount(stage)
  return () => {
    dispose()
    host.replaceChildren()
  }
}

const VIZ_CAPTIONS: Record<string, string> = {
  frameLoop: '摇动的世界是 tick 驱动的；两个环各转各的。每 4 秒会故意卡一次 —— 看内圈会不会「补跳」。',
  clock: '三只时钟：真实时间、固定 tick、显示帧。它们永远不同步，也不该同步。',
}
