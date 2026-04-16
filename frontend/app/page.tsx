"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { LoginPage } from "@/components/login-page"
import { Navbar } from "@/components/navbar"
import { AdminDashboard } from "@/components/dashboards/admin-dashboard"
import { GuardDashboard } from "@/components/dashboards/guard-dashboard"
import { ResidentDashboard } from "@/components/dashboards/resident-dashboard"
import { VisitorDashboard } from "@/components/dashboards/visitor-dashboard"
import { Loader2 } from "lucide-react"

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth()

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  // Render dashboard based on user role
  const renderDashboard = () => {
    switch (user.role) {
      case "admin":
        return <AdminDashboard />
      case "guard":
        return <GuardDashboard />
      case "resident":
        return <ResidentDashboard />
      case "visitor":
        return <VisitorDashboard />
      default:
        return <VisitorDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar systemStatus="online" />

      <main className="mx-auto max-w-7xl w-full px-4 py-6 sm:px-6 lg:px-8 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={user.role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderDashboard()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="glass border-t border-border/30 py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          Smart Parking System - AI-Powered Parking Management
        </div>
      </footer>
    </div>
  )
}

export default function SmartParkingApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
