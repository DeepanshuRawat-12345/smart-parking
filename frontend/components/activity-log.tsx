"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Car, LogIn, LogOut, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ActivityEntry {
  id: string
  type: "entry" | "exit" | "alert" | "approval"
  message: string
  vehicleNumber?: string
  timestamp: Date
  slotNumber?: string
}

interface ActivityLogProps {
  entries: ActivityEntry[]
  maxEntries?: number
}

const typeConfig = {
  entry: {
    icon: LogIn,
    color: "text-neon-green",
    bgColor: "bg-neon-green/10",
    label: "Entry",
  },
  exit: {
    icon: LogOut,
    color: "text-neon-blue",
    bgColor: "bg-neon-blue/10",
    label: "Exit",
  },
  alert: {
    icon: AlertCircle,
    color: "text-neon-yellow",
    bgColor: "bg-neon-yellow/10",
    label: "Alert",
  },
  approval: {
    icon: CheckCircle,
    color: "text-neon-cyan",
    bgColor: "bg-neon-cyan/10",
    label: "Approved",
  },
}

export function ActivityLog({ entries, maxEntries = 10 }: ActivityLogProps) {
  const displayEntries = entries.slice(0, maxEntries)

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  return (
    <div className="glass-card rounded-xl border border-border/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Activity Log</h3>
        <div className="flex items-center gap-2">
          <motion.div
            className="h-2 w-2 rounded-full bg-neon-green"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displayEntries.map((entry, index) => {
            const config = typeConfig[entry.type]
            const Icon = config.icon

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3"
              >
                <div className={cn("rounded-lg p-2", config.bgColor)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-medium", config.color)}>
                      {config.label}
                    </span>
                    {entry.vehicleNumber && (
                      <span className="font-mono text-xs text-foreground">
                        {entry.vehicleNumber}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground truncate">
                    {entry.message}
                  </p>
                  {entry.slotNumber && (
                    <div className="mt-1 flex items-center gap-1">
                      <Car className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Slot {entry.slotNumber}
                      </span>
                    </div>
                  )}
                </div>
                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(entry.timestamp)}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {displayEntries.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No recent activity
          </div>
        )}
      </div>
    </div>
  )
}
