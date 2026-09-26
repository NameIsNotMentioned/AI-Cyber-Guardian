import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { animate, onScroll } from 'animejs'

/** A quiet, decorative optical instrument whose orientation follows page scroll. */
export function ScrollInstrument() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const scrollTarget = document.querySelector<HTMLElement>('.site-shell')
    if (!host || !scrollTarget) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 40)
    camera.position.z = 8

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.2 : 1.6))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xf1eadb, 1.75))
    const keyLight = new THREE.PointLight(0xfff0d7, 52, 18)
    keyLight.position.set(-2.8, 3.4, 4.8)
    scene.add(keyLight)
    const fillLight = new THREE.PointLight(0x9b8060, 20, 13)
    fillLight.position.set(3.2, -2.2, -1.5)
    scene.add(fillLight)

    const instrument = new THREE.Group()
    const brass = new THREE.MeshStandardMaterial({ color: 0x9b8058, metalness: 0.78, roughness: 0.28 })
    const paleBrass = new THREE.MeshStandardMaterial({ color: 0xc2ad81, metalness: 0.68, roughness: 0.24 })
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xe1e7dc,
      metalness: 0.035,
      roughness: 0.12,
      transmission: 0.78,
      thickness: 0.72,
      ior: 1.42,
      clearcoat: 0.86,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.88,
    })
    const mineral = new THREE.MeshPhysicalMaterial({
      color: 0x7b8270,
      metalness: 0.28,
      roughness: 0.2,
      clearcoat: 0.75,
      clearcoatRoughness: 0.16,
    })

    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.82, 40, 32), glass)
    lens.scale.z = 0.24
    instrument.add(lens)

    const seal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), mineral)
    seal.rotation.set(0.22, 0.3, 0.12)
    seal.position.z = 0.27
    instrument.add(seal)

    const outerRim = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.035, 10, 96), brass)
    instrument.add(outerRim)
    const innerRim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.012, 8, 96), paleBrass)
    innerRim.position.z = 0.13
    instrument.add(innerRim)

    const gimbal = new THREE.Group()
    const gimbalRing = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.018, 8, 96), paleBrass)
    gimbalRing.rotation.x = Math.PI * 0.48
    gimbal.add(gimbalRing)
    const crossRing = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.012, 8, 96), brass)
    crossRing.rotation.y = Math.PI * 0.5
    gimbal.add(crossRing)
    instrument.add(gimbal)

    const markerGeometry = new THREE.BoxGeometry(0.018, 0.105, 0.026)
    const markers = new THREE.InstancedMesh(markerGeometry, paleBrass, 32)
    const markerTransform = new THREE.Object3D()
    for (let index = 0; index < 32; index += 1) {
      const angle = (index / 32) * Math.PI * 2
      markerTransform.position.set(Math.cos(angle) * 1.16, Math.sin(angle) * 1.16, 0.015)
      markerTransform.rotation.set(0, 0, angle - Math.PI / 2)
      markerTransform.updateMatrix()
      markers.setMatrixAt(index, markerTransform.matrix)
    }
    instrument.add(markers)

    const pivot = new THREE.Group()
    pivot.position.set(
      (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * (window.innerWidth / window.innerHeight)) * (window.innerWidth < 720 ? 0.2 : 0.34),
      window.innerWidth < 720 ? -0.48 : 0.08,
      0,
    )
    pivot.scale.setScalar(window.innerWidth < 720 ? 0.48 : 1.04)
    pivot.add(instrument)
    scene.add(pivot)

    const draw = () => renderer.render(scene, camera)
    draw()

    const scrollMotion = reducedMotion ? null : animate(instrument.rotation, {
      x: [-0.18, Math.PI * 0.56],
      y: [-0.42, Math.PI * 2.18],
      z: [0.12, -0.28],
      duration: 1000,
      ease: 'linear',
      autoplay: false,
      onUpdate: draw,
    })
    const scrollObserver = scrollMotion ? onScroll({
      target: scrollTarget,
      enter: 'top top',
      leave: 'bottom bottom',
      sync: 0.28,
    }).link(scrollMotion) : null

    let resizeFrame = 0
    const resize = () => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        const width = window.innerWidth
        const height = window.innerHeight
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 720 ? 1.2 : 1.6))
        renderer.setSize(width, height)
        pivot.position.x = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect * (width < 720 ? 0.2 : 0.34)
        pivot.position.y = width < 720 ? -0.48 : 0.08
        pivot.scale.setScalar(width < 720 ? 0.48 : 1.04)
        draw()
      })
    }
    window.addEventListener('resize', resize, { passive: true })

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(resizeFrame)
      scrollObserver?.revert()
      scrollMotion?.cancel()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="scroll-instrument" ref={hostRef} aria-hidden="true" />
}
