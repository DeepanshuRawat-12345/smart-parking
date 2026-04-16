"use client"

import { motion } from "framer-motion"
import { Car, Lock, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"

export type SlotStatus = "free" | "occupied" | "reserved"

interface SlotCardProps {
  slotNumber: string
  status: SlotStatus
  vehicleNumber?: string
  ownerFlat?: string
  onClick?: () => void
  showDetails?: boolean
}

const statusConfig = {
  free: {
    label: "Free",
    color: "border-neon-green/50 bg-neon-green/10",
    glowClass: "glow-green",
    textColor: "text-neon-green",
    icon: Unlock,
  },
  occupied: {
    label: "Occupied",
    color: "border-neon-red/50 bg-neon-red/10",
    glowClass: "glow-red",
    textColor: "text-neon-red",
    icon: Car,
  },
  reserved: {
    label: "Reserved",
    color: "border-neon-yellow/50 bg-neon-yellow/10",
    glowClass: "glow-yellow",
    textColor: "text-neon-yellow",
    icon: Lock,
  },
}

export function SlotCard({
  slotNumber,
  status,
  vehicleNumber,
  ownerFlat,
  onClick,
  showDetails = false,
}: SlotCardProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300",
        config.color,
        onClick && "hover:brightness-110"
      )}
    >
      {/* Glow effect */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-xl opacity-30",
          status === "free" && "animate-pulse-glow"
        )}
        style={{
          boxShadow:
            status === "free"
              ? "0 0 20px rgba(74, 222, 128, 0.3)"
              : status === "occupied"
              ? "0 0 15px rgba(248, 113, 113, 0.2)"
              : "0 0 15px rgba(250, 204, 21, 0.2)",
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">{slotNumber}</span>
          <Icon className={cn("h-5 w-5", config.textColor)} />
        </div>

        <div className={cn("mt-2 text-sm font-medium", config.textColor)}>
          {config.label}
        </div>

        {showDetails && status === "occupied" && vehicleNumber && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 space-y-1 border-t border-border/30 pt-3"
          >
            <p className="text-xs text-muted-foreground">
              Vehicle: <span className="font-mono text-foreground">{vehicleNumber}</span>
            </p>
            {ownerFlat && (
              <p className="text-xs text-muted-foreground">
                Flat: <span className="text-foreground">{ownerFlat}</span>
              </p>
            )}
          </motion.div>
        )}

        {showDetails && status === "reserved" && ownerFlat && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 border-t border-border/30 pt-3"
          >
            <p className="text-xs text-muted-foreground">
              Reserved for: <span className="text-foreground">Flat {ownerFlat}</span>
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
