"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Car, LogOut, Shield, User, UserCheck, Users } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { UserRole } from "@/lib/types"

interface NavbarProps {
  systemStatus?: "online" | "offline"
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "text-cyan-400" },
  guard: { label: "Security Guard", icon: UserCheck, color: "text-blue-400" },
  resident: { label: "Resident", icon: User, color: "text-green-400" },
  visitor: { label: "Visitor", icon: Users, color: "text-yellow-400" },
}

export function Navbar({ systemStatus = "online" }: NavbarProps) {
  const { user, logout } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const currentRole = user?.role || "visitor"
  const RoleIcon = roleConfig[currentRole].icon

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass sticky top-0 z-50 px-6 py-4"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo & Title */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative">
            <Car className="h-8 w-8 text-cyan-400" />
            <div className="absolute inset-0 blur-md">
              <Car className="h-8 w-8 text-cyan-400 opacity-50" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground text-glow-cyan">
              Smart Parking
            </h1>
            <p className="text-xs text-muted-foreground">AI-Powered System</p>
          </div>
        </motion.div>

        {/* Center - Time & Date */}
        <div className="hidden items-center gap-6 md:flex">
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-cyan-400 text-glow-cyan">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-muted-foreground">{formatDate(currentTime)}</div>
          </div>
        </div>

        {/* Right - User Info & Logout */}
        <div className="flex items-center gap-4">
          {/* System Status */}
          <div className="flex items-center gap-2">
            <motion.div
              className={`h-2.5 w-2.5 rounded-full ${
                systemStatus === "online" ? "bg-green-400 glow-green" : "bg-red-400 glow-red"
              }`}
              animate={{
                scale: systemStatus === "online" ? [1, 1.2, 1] : 1,
                opacity: systemStatus === "online" ? [1, 0.7, 1] : 1,
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {systemStatus === "online" ? "System Active" : "System Offline"}
            </span>
          </div>

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <RoleIcon className={`h-5 w-5 ${roleConfig[currentRole].color}`} />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{roleConfig[currentRole].label}</p>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </motion.nav>
  )
}
