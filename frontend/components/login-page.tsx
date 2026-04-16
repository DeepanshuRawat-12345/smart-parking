"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Car, Eye, EyeOff, Loader2, Shield, User, Users, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import type { UserRole } from "@/lib/types"

export function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!username.trim() || !password.trim()) {
      setLocalError("Please enter both username and password")
      return
    }

    try {
      await login(username, password)
    } catch (err) {
      // Error is handled by auth context
    }
  }

  const roleIcons: Record<UserRole, React.ReactNode> = {
    admin: <Shield className="w-5 h-5" />,
    guard: <UserCheck className="w-5 h-5" />,
    resident: <User className="w-5 h-5" />,
    visitor: <Users className="w-5 h-5" />,
  }

  const roleDescriptions: Record<UserRole, string> = {
    admin: "Full system control",
    guard: "Entry/Exit management",
    resident: "Manage visitors",
    visitor: "Request parking",
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass-card mb-4 glow-cyan"
          >
            <Car className="w-10 h-10 text-cyan-400" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Smart <span className="text-cyan-400 text-glow-cyan">Parking</span>
          </h1>
          <p className="text-muted-foreground">AI-Powered Parking Management</p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background/50 border-border/50 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {(error || localError) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                {error || localError}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-6 glow-cyan transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Role Info */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Available Roles
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(roleIcons) as UserRole[]).map((role) => (
                <motion.div
                  key={role}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-background/30 border border-border/30"
                >
                  <div className="text-cyan-400">{roleIcons[role]}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {role}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roleDescriptions[role]}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          Contact admin for account access
        </p>
      </motion.div>
    </div>
  )
}
