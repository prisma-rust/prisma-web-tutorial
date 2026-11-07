import * as THREE from 'three'

/**
 * 第 01 章的可视化：三只时钟。
 *
 * 内圈 = 固定 tick(每秒 60 次，绿色)
 * 外圈 = 显示帧(这里锁在 60，青色)
 * 中间 = 世界(它只认 tick，不认帧)
 *
 * 故意做成两个独立转速的环：你把浏览器标签切走再回来，
 * 它们不会「累积」出多余的 tick —— 这正是时间要被丢弃的原因。
 */
export function mountFrameLoop(host: HTMLElement): () => void {
  host.classList.add('viz', 'viz-frame-loop')

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
  camera.position.set(0, 4.6, 9.2)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 1.1))
  const key = new THREE.DirectionalLight(0x9fd4ff, 2.2)
  key.position.set(4, 8, 6)
  scene.add(key)

  const world = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 1),
    new THREE.MeshStandardMaterial({ color: 0x2b3b57, roughness: 0.35, metalness: 0.5, flatShading: true }),
  )
  scene.add(world)

  const ring = (radius: number, color: number) =>
    new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 8, 160),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28 }),
    ).rotateX(Math.PI / 2)

  scene.add(ring(3.0, 0x54e6a6))
  scene.add(ring(3.9, 0x5ec8ff))

  const dotGeo = new THREE.SphereGeometry(0.075, 12, 12)
  const tickDots: THREE.Mesh[] = []
  const frameDots: THREE.Mesh[] = []

  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0x54e6a6 }))
    scene.add(m)
    tickDots.push(m)
  }
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x5ec8ff, transparent: true, opacity: 0.75 }),
    )
    scene.add(m)
    frameDots.push(m)
  }

  let running = true
  let raf = 0
  let t = 0
  let last = performance.now()
  let slow = false

  const place = (dots: THREE.Mesh[], radius: number, phase: number) => {
    dots.forEach((m, i) => {
      const a = phase + (i / dots.length) * Math.PI * 2
      m.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius)
      m.scale.setScalar(1)
    })
  }

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    if (!running) return

    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    t += dt

    // 模拟「卡了一帧」：每 4 秒有 0.6 秒的慢帧，观察内圈不会补跳。
    slow = t % 4 > 3.4
    const simSpeed = slow ? 0.35 : 1

    world.rotation.y += dt * 0.45 * simSpeed
    world.rotation.x = Math.sin(t * 0.4) * 0.18

    place(tickDots, 3.0, t * Math.PI * 2 * (simSpeed * 0.5))
    place(frameDots, 3.9, -t * Math.PI * 2 * 0.5)

    const pulse = slow ? 1.6 : 1
    tickDots.forEach((m) => m.scale.setScalar(pulse))

    renderer.render(scene, camera)
  }

  const resize = () => {
    const w = host.clientWidth || 640
    const h = host.clientHeight || 320
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  const io = new IntersectionObserver(
    (entries) => {
      running = entries.some((e) => e.isIntersecting)
      if (running) last = performance.now()
    },
    { threshold: 0.05 },
  )
  io.observe(host)

  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    ro.disconnect()
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        const mat = o.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat.dispose()
      }
    })
    renderer.dispose()
    renderer.domElement.remove()
  }
}
