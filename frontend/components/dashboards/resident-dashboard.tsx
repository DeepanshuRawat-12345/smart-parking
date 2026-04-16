"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR, { mutate } from "swr"
import {
  Car,
  Home,
  Clock,
  Check,
  X,
  User,
  Bell,
  Loader2,
  RefreshCw,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  getVisitorRequests,
  getParkingStatus,
  approveRequest,
  rejectRequest,
} from "@/lib/api"
import type { VisitorRequest } from "@/lib/types"

export function ResidentDashboard() {
  const { user } = useAuth()
  const flatNumber = user?.flat_number || "101" // Fallback for demo

  // Fetch data using SWR - poll every 5 seconds for real-time updates
  const { data: allRequests, isLoading: requestsLoading } = useSWR(
    "requests",
    getVisitorRequests,
    { refreshInterval: 5000 }
  )
  const { data: slots } = useSWR("parking-status", getParkingStatus, { refreshInterval: 5000 })
  
  // Filter requests for this flat
  const requests = allRequests?.filter((r) => r.flat_number === flatNumber)

  const [isProcessing, setIsProcessing] = useState<number | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Find resident's parking slot
  const residentSlot = slots?.find(
    (s) => s.owner_flat === flatNumber && s.status === "occupied"
  )
  const parkingStatus = residentSlot ? "parked" : "not_parked"

  const pendingRequests = requests?.filter((r) => r.status === "pending") || []
  const approvedCount = requests?.filter((r) => r.status === "approved" || r.status === "entered").length || 0

  const handleApprove = async (requestId: number) => {
    setIsProcessing(requestId)
    setActionMessage(null)

    try {
      await approveRequest(requestId)
      setActionMessage({ type: "success", text: "Request approved successfully" })
      mutate("requests")
    } catch (error) {
      setActionMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to approve request" 
      })
    } finally {
      setIsProcessing(null)
    }
  }

  const handleReject = async (requestId: number) => {
    setIsProcessing(requestId)
    setActionMessage(null)

    try {
      await rejectRequest(requestId)
      setActionMessage({ type: "success", text: "Request rejected" })
      mutate("requests")
    } catch (error) {
      setActionMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to reject request" 
      })
    } finally {
      setIsProcessing(null)
    }
  }

  const handleRefresh = () => {
    mutate("requests")
    mutate("parking-status")
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Welcome Section */}
      <div className="glass-card rounded-xl border border-border/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome, {user?.username || "Resident"}
            </h1>
            <p className="text-muted-foreground">Flat {flatNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div className="relative">
              <Bell className="h-6 w-6 text-muted-foreground" />
              {pendingRequests.length > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
                >
                  {pendingRequests.length}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Message */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "rounded-lg p-4 border",
              actionMessage.type === "success" 
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            )}
          >
            {actionMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl border border-cyan-500/30 p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-foreground">My Details</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="mt-1 font-medium text-foreground">
                {user?.username || "N/A"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary/30 p-3">
                <Home className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flat Number</p>
                <p className="font-medium text-foreground">{flatNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary/30 p-3">
                <Car className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-mono text-foreground">
                  {residentSlot?.vehicle_number || "Not registered"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Parking Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "glass-card rounded-xl border p-6",
            parkingStatus === "parked"
              ? "border-green-500/30"
              : "border-yellow-500/30"
          )}
        >
          <div className="mb-4 flex items-center gap-2">
            <MapPin
              className={cn(
                "h-5 w-5",
                parkingStatus === "parked" ? "text-green-400" : "text-yellow-400"
              )}
            />
            <h2 className="text-lg font-semibold text-foreground">Parking Status</h2>
          </div>

          <div className="relative">
            <div className="mb-4 flex items-center justify-center">
              <motion.div
                className={cn(
                  "relative flex h-24 w-24 items-center justify-center rounded-full",
                  parkingStatus === "parked"
                    ? "bg-green-500/20"
                    : "bg-yellow-500/20"
                )}
                animate={{
                  boxShadow:
                    parkingStatus === "parked"
                      ? [
                          "0 0 20px rgba(74, 222, 128, 0.3)",
                          "0 0 40px rgba(74, 222, 128, 0.5)",
                          "0 0 20px rgba(74, 222, 128, 0.3)",
                        ]
                      : [
                          "0 0 20px rgba(250, 204, 21, 0.3)",
                          "0 0 40px rgba(250, 204, 21, 0.5)",
                          "0 0 20px rgba(250, 204, 21, 0.3)",
                        ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Car
                  className={cn(
                    "h-10 w-10",
                    parkingStatus === "parked" ? "text-green-400" : "text-yellow-400"
                  )}
                />
              </motion.div>
            </div>

            <div className="text-center">
              <p
                className={cn(
                  "text-lg font-bold",
                  parkingStatus === "parked" ? "text-green-400" : "text-yellow-400"
                )}
              >
                {parkingStatus === "parked" ? "Vehicle Parked" : "Not Parked"}
              </p>
              {parkingStatus === "parked" && residentSlot && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Slot: <span className="font-mono font-bold">{residentSlot.location}</span>
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl border border-border/50 p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-foreground">Statistics</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-yellow-400" />
                <span className="text-muted-foreground">Pending Requests</span>
              </div>
              <span className="font-mono text-2xl font-bold text-yellow-400">
                {pendingRequests.length}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-400" />
                <span className="text-muted-foreground">Approved Visitors</span>
              </div>
              <span className="font-mono text-2xl font-bold text-green-400">
                {approvedCount}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-cyan-400" />
                <span className="text-muted-foreground">Total Requests</span>
              </div>
              <span className="font-mono text-2xl font-bold text-cyan-400">
                {requests?.length || 0}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visitor Requests Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-xl border border-border/50 p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-foreground">Visitor Requests</h2>
          </div>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400">
              {pendingRequests.length} Pending
            </span>
          )}
        </div>

        {requestsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {requests && requests.length > 0 ? (
                requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between",
                      request.status === "pending"
                        ? "bg-yellow-500/10 border border-yellow-500/20"
                        : request.status === "approved" || request.status === "entered"
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-red-500/10 border border-red-500/20"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{request.visitor_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.phone} {request.vehicle_number && `| ${request.vehicle_number}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {request.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            disabled={isProcessing === request.id}
                            className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                          >
                            {isProcessing === request.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-1 h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReject(request.id)}
                            disabled={isProcessing === request.id}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                          >
                            <X className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-sm font-medium capitalize",
                            (request.status === "approved" || request.status === "entered")
                              ? "bg-green-500/20 text-green-400"
                              : request.status === "exited"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {request.status}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No visitor requests for your flat
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
