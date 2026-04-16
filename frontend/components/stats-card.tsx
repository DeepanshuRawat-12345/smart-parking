"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: { value: number; isPositive: boolean }
  color?: "cyan" | "green" | "red" | "yellow" | "blue"
  suffix?: string
}

const colorConfig = {
  cyan: {
    text: "text-neon-cyan",
    bg: "bg-neon-cyan/10",
    border: "border-neon-cyan/30",
    glow: "glow-cyan",
  },
  green: {
    text: "text-neon-green",
    bg: "bg-neon-green/10",
    border: "border-neon-green/30",
    glow: "glow-green",
  },
  red: {
    text: "text-neon-red",
    bg: "bg-neon-red/10",
    border: "border-neon-red/30",
    glow: "glow-red",
  },
  yellow: {
    text: "text-neon-yellow",
    bg: "bg-neon-yellow/10",
    border: "border-neon-yellow/30",
    glow: "glow-yellow",
  },
  blue: {
    text: "text-neon-blue",
    bg: "bg-neon-blue/10",
    border: "border-neon-blue/30",
    glow: "glow-blue",
  },
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "cyan",
  suffix = "",
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const config = colorConfig[color]

  useEffect(() => {
    const duration = 1000
    const steps = 30
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "glass-card relative overflow-hidden rounded-xl border p-6",
        config.border
      )}
    >
      {/* Background glow */}
      <div
        className={cn(
          "absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20 blur-2xl",
          config.bg
        )}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <motion.span
                className={cn("text-4xl font-bold", config.text)}
                key={displayValue}
              >
                {displayValue}
              </motion.span>
              {suffix && (
                <span className="text-lg text-muted-foreground">{suffix}</span>
              )}
            </div>
          </div>
          <div className={cn("rounded-lg p-3", config.bg)}>
            <Icon className={cn("h-6 w-6", config.text)} />
          </div>
        </div>

        {trend && (
          <div className="mt-4 flex items-center gap-1">
            <span
              className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-neon-green" : "text-neon-red"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">vs last hour</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
