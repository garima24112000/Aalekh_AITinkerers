"use client"
import { useEffect, useRef } from "react"

interface Props {
  warpSpeed?: boolean
}

export default function StarField({ warpSpeed = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const starsRef = useRef<Array<{ x: number; y: number; z: number; px: number; py: number }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = canvas.width = window.innerWidth
    const H = canvas.height = window.innerHeight
    const CX = W / 2
    const CY = H / 2
    const NUM_STARS = 280

    // Init stars
    starsRef.current = Array.from({ length: NUM_STARS }, () => ({
      x: Math.random() * W - CX,
      y: Math.random() * H - CY,
      z: Math.random() * W,
      px: 0, py: 0,
    }))

    const draw = () => {
      ctx.fillStyle = "rgba(4,4,10,0.25)"
      ctx.fillRect(0, 0, W, H)

      const speed = warpSpeed ? 28 : 3

      starsRef.current.forEach(star => {
        star.px = star.x / (star.z / W) + CX
        star.py = star.y / (star.z / W) + CY

        star.z -= speed

        if (star.z <= 0 || star.px < 0 || star.px > W || star.py < 0 || star.py > H) {
          star.x = Math.random() * W - CX
          star.y = Math.random() * H - CY
          star.z = W
          star.px = star.x / (star.z / W) + CX
          star.py = star.y / (star.z / W) + CY
        }

        const nx = star.x / (star.z / W) + CX
        const ny = star.y / (star.z / W) + CY
        const size = Math.max(0.3, (1 - star.z / W) * 3.5)
        const brightness = Math.floor((1 - star.z / W) * 255)

        ctx.beginPath()
        if (warpSpeed) {
          // Draw streaks
          ctx.strokeStyle = `rgba(${brightness},${brightness + 30},255,${(1 - star.z / W) * 0.9})`
          ctx.lineWidth = size * 0.6
          ctx.moveTo(star.px, star.py)
          ctx.lineTo(nx, ny)
          ctx.stroke()
        } else {
          ctx.fillStyle = `rgba(${brightness},${brightness},${Math.min(255, brightness + 60)},${(1 - star.z / W) * 0.9})`
          ctx.arc(nx, ny, size, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      animRef.current = requestAnimationFrame(draw)
    }

    ctx.fillStyle = "#04040a"
    ctx.fillRect(0, 0, W, H)
    draw()

    return () => cancelAnimationFrame(animRef.current)
  }, [warpSpeed])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0,
        width: "100vw", height: "100vh",
        zIndex: 0, pointerEvents: "none",
      }}
    />
  )
}
