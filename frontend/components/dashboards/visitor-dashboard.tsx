"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR from "swr"
import {
  Car,
  User,
  Phone,
  Home,
  Send,
  CheckCircle,
  Clock,
  MapPin,
  Loader2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { submitVisitRequest, getVisitorRequests } from "@/lib/api"
import type { VisitorRequest } from "@/lib/types"

type RequestStatus = "idle" | "submitting" | "pending" | "approved" | "rejected" | "entered"

export function VisitorDashboard() {
  const [visitorName, setVisitorName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [flatNumber, setFlatNumber] = useState("")
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle")
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null)
  const [assignedSlot, setAssignedSlot] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Poll for request status updates when we have a pending request
  const { data: requests } = useSWR(
    currentRequestId ? "visitor-requests" : null,
    getVisitorRequests,
    { refreshInterval: 3000 } // Poll every 3 seconds
  )

  // Check if our request status has changed
  useEffect(() => {
    if (currentRequestId && requests) {
      const myRequest = requests.find((r) => r.id === currentRequestId)
      if (myRequest) {
        if (myRequest.status === "approved" && requestStatus === "pending") {
          setRequestStatus("approved")
        } else if (myRequest.status === "rejected" && requestStatus === "pending") {
          setRequestStatus("rejected")
        } else if (myRequest.status === "entered") {
          setRequestStatus("entered")
          setAssignedSlot(myRequest.assigned_slot || null)
        }
      }
    }
  }, [requests, currentRequestId, requestStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!visitorName || !phoneNumber || !flatNumber) {
      setErrorMessage("Please fill in all required fields")
      return
    }

    setRequestStatus("submitting")

    try {
      const result = await submitVisitRequest({
        visitor_name: visitorName,
        phone: phoneNumber,
        flat_number: flatNumber,
        vehicle_number: vehicleNumber || undefined,
        vehicle_type: vehicleNumber ? "car" : undefined,
      })

      setCurrentRequestId(result.request_id)
      setRequestStatus("pending")
    } catch (error) {
      setRequestStatus("idle")
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit request. Please try again."
      )
    }
  }

  const handleReset = () => {
    setVisitorName("")
    setPhoneNumber("")
    setFlatNumber("")
    setVehicleNumber("")
    setRequestStatus("idle")
    setCurrentRequestId(null)
    setAssignedSlot(null)
    setErrorMessage(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-[calc(100vh-120px)] items-center justify-center p-4"
    >
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {requestStatus === "idle" || requestStatus === "submitting" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card rounded-2xl border border-border/50 p-8"
            >
              {/* Header */}
              <div className="mb-8 text-center">
                <motion.div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(34, 211, 238, 0.3)",
                      "0 0 40px rgba(34, 211, 238, 0.5)",
                      "0 0 20px rgba(34, 211, 238, 0.3)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Car className="h-8 w-8 text-cyan-400" />
                </motion.div>
                <h1 className="text-2xl font-bold text-foreground">
                  Request Parking
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Fill in your details to request visitor parking
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-sm"
                >
                  {errorMessage}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Visitor Name */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Your Name *
                  </label>
                  <Input
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Enter your full name"
                    className="border-border/50 bg-secondary/50 focus:border-cyan-500 focus:ring-cyan-500/20"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Phone Number *
                  </label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                    type="tel"
                    className="border-border/50 bg-secondary/50 focus:border-cyan-500 focus:ring-cyan-500/20"
                    required
                  />
                </div>

                {/* Flat Number */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Home className="h-4 w-4" />
                    Visiting Flat Number *
                  </label>
                  <Input
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    placeholder="e.g., 203"
                    className="border-border/50 bg-secondary/50 focus:border-cyan-500 focus:ring-cyan-500/20"
                    required
                  />
                </div>

                {/* Vehicle Number (Optional) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Car className="h-4 w-4" />
                    Vehicle Number (Optional)
                  </label>
                  <Input
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., DL-01-AB-1234"
                    className="border-border/50 bg-secondary/50 font-mono focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    Vehicle details can also be added by security at entry
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={requestStatus === "submitting"}
                  className="w-full bg-cyan-500 text-white hover:bg-cyan-600"
                >
                  {requestStatus === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Request Parking
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          ) : requestStatus === "pending" ? (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card rounded-2xl border border-yellow-500/30 p-8 text-center"
            >
              <motion.div
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20"
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(250, 204, 21, 0.3)",
                    "0 0 40px rgba(250, 204, 21, 0.5)",
                    "0 0 20px rgba(250, 204, 21, 0.3)",
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Clock className="h-10 w-10 text-yellow-400" />
              </motion.div>

              <h2 className="mb-2 text-2xl font-bold text-foreground">
                Waiting for Approval
              </h2>
              <p className="mb-6 text-muted-foreground">
                Your request has been sent to Flat {flatNumber}. Please wait for their response.
              </p>

              {/* Request Details */}
              <div className="mb-6 rounded-lg bg-secondary/30 p-4 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-foreground">{visitorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-foreground">{phoneNumber}</span>
                  </div>
                  {vehicleNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle:</span>
                      <span className="font-mono text-foreground">{vehicleNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visiting:</span>
                    <span className="text-foreground">Flat {flatNumber}</span>
                  </div>
                </div>
              </div>

              {/* Loading dots */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-yellow-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleReset}
                className="border-border/50"
              >
                Cancel Request
              </Button>
            </motion.div>
          ) : requestStatus === "approved" ? (
            <motion.div
              key="approved"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl border border-green-500/30 p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20"
              >
                <CheckCircle className="h-10 w-10 text-green-400" />
              </motion.div>

              <h2 className="mb-2 text-2xl font-bold text-green-400">
                Request Approved!
              </h2>
              <p className="mb-6 text-muted-foreground">
                Your parking request has been approved. Please proceed to the security gate.
              </p>

              <div className="mb-6 rounded-lg bg-secondary/30 p-4 text-left">
                <p className="text-sm text-muted-foreground mb-2">Next Steps:</p>
                <ol className="list-decimal list-inside text-sm text-foreground space-y-1">
                  <li>Proceed to the entry gate</li>
                  <li>Show this approval to security</li>
                  <li>Security will verify and assign a slot</li>
                </ol>
              </div>

              <Button
                onClick={handleReset}
                className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
              >
                New Request
              </Button>
            </motion.div>
          ) : requestStatus === "entered" ? (
            <motion.div
              key="entered"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl border border-green-500/30 p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20"
              >
                <CheckCircle className="h-10 w-10 text-green-400" />
              </motion.div>

              <h2 className="mb-2 text-2xl font-bold text-green-400">
                Welcome!
              </h2>
              <p className="mb-6 text-muted-foreground">
                You have entered the parking area.
              </p>

              {assignedSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6 rounded-xl bg-green-500/10 border border-green-500/30 p-6"
                >
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <MapPin className="h-5 w-5" />
                    <span className="text-sm font-medium">Your Parking Slot</span>
                  </div>
                  <p className="mt-2 font-mono text-4xl font-bold text-green-400 text-glow-green">
                    {assignedSlot}
                  </p>
                </motion.div>
              )}

              <Button
                onClick={handleReset}
                className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
              >
                Done
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="rejected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl border border-red-500/30 p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20"
              >
                <XCircle className="h-10 w-10 text-red-400" />
              </motion.div>

              <h2 className="mb-2 text-2xl font-bold text-red-400">
                Request Declined
              </h2>
              <p className="mb-6 text-muted-foreground">
                Your request was declined by the resident. Please contact them directly or try again later.
              </p>

              <Button
                onClick={handleReset}
                className="w-full bg-cyan-500 text-white hover:bg-cyan-600"
              >
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
