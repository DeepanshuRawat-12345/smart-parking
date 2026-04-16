"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import useSWR, { mutate } from "swr"
import {
  Car,
  Users,
  Shield,
  Activity,
  ParkingSquare,
  RefreshCw,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { StatsCard } from "@/components/stats-card"
import { ParkingGrid } from "@/components/parking-grid"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  getParkingStatus,
  getResidents,
  getGuards,
  getVisitorRequests,
  updateSlot,
  createSlots,
  deleteResident,
  deleteGuard,
} from "@/lib/api"
import type { Slot, Resident, Guard, VisitorRequest } from "@/lib/types"

export function AdminDashboard() {
  // Fetch data using SWR with real-time polling
  const { data: slots, error: slotsError, isLoading: slotsLoading } = useSWR(
    "parking-status", 
    getParkingStatus,
    { refreshInterval: 5000 }
  )
  const { data: residents, error: residentsError } = useSWR("residents", getResidents)
  const { data: guards, error: guardsError } = useSWR("guards", getGuards)
  const { data: requests } = useSWR("requests", getVisitorRequests, { refreshInterval: 5000 })

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<"free" | "occupied" | "reserved">("free")
  const [flatNumber, setFlatNumber] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isCreatingSlots, setIsCreatingSlots] = useState(false)

  // Calculate stats
  const totalSlots = slots?.length || 0
  const occupiedSlots = slots?.filter((s) => s.status === "occupied").length || 0
  const freeSlots = slots?.filter((s) => s.status === "free").length || 0
  const reservedSlots = slots?.filter((s) => s.is_reserved).length || 0
  const todayEntries = requests?.filter((r) => {
    const today = new Date().toDateString()
    return r.entry_time && new Date(r.entry_time).toDateString() === today
  }).length || 0

  const handleSlotClick = (slot: Slot) => {
    setSelectedSlot(slot)
    setNewStatus(slot.status)
    setFlatNumber(slot.owner_flat || "")
    setIsDialogOpen(true)
  }

  const handleUpdateSlot = async () => {
    if (!selectedSlot) return
    
    setIsUpdating(true)
    try {
      await updateSlot({
        slot_id: selectedSlot.id,
        status: newStatus,
        owner_flat: flatNumber || undefined,
      })
      mutate("parking-status")
      setIsDialogOpen(false)
      setSelectedSlot(null)
    } catch (error) {
      console.error("Failed to update slot:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateSlots = async () => {
    setIsCreatingSlots(true)
    try {
      await createSlots(12) // Create 12 slots
      mutate("parking-status")
    } catch (error) {
      console.error("Failed to create slots:", error)
    } finally {
      setIsCreatingSlots(false)
    }
  }

  const handleRefresh = () => {
    mutate("parking-status")
    mutate("residents")
    mutate("guards")
    mutate("requests")
  }

  const handleDeleteResident = async (id: number) => {
    try {
      await deleteResident(id)
      mutate("residents")
    } catch (error) {
      console.error("Failed to delete resident:", error)
    }
  }

  const handleDeleteGuard = async (id: number) => {
    try {
      await deleteGuard(id)
      mutate("guards")
    } catch (error) {
      console.error("Failed to delete guard:", error)
    }
  }

  // Convert API slots to ParkingGrid format
  const gridSlots = slots?.map((slot) => ({
    id: slot.id.toString(),
    slotNumber: slot.location,
    status: slot.status,
    vehicleNumber: slot.vehicle_number,
    ownerFlat: slot.owner_flat,
    slotType: slot.slot_type,
  })) || []

  if (slotsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (slotsError) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-muted-foreground">Failed to load parking data</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Stats Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Slots"
          value={totalSlots}
          icon={ParkingSquare}
          color="cyan"
        />
        <StatsCard
          title="Occupied Slots"
          value={occupiedSlots}
          icon={Car}
          color="red"
          trend={{ value: Math.round((occupiedSlots / totalSlots) * 100) || 0, isPositive: false }}
        />
        <StatsCard
          title="Free Slots"
          value={freeSlots}
          icon={Activity}
          color="green"
          trend={{ value: Math.round((freeSlots / totalSlots) * 100) || 0, isPositive: true }}
        />
        <StatsCard
          title="Daily Entries"
          value={todayEntries}
          icon={Users}
          color="blue"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Parking Grid Section */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl border border-border/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Parking Grid</h2>
                <p className="text-sm text-muted-foreground">
                  Click on a slot to manage
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="border-border/50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                {totalSlots === 0 && (
                  <Button
                    size="sm"
                    onClick={handleCreateSlots}
                    disabled={isCreatingSlots}
                    className="bg-cyan-500 text-white hover:bg-cyan-600"
                  >
                    {isCreatingSlots ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Initialize Slots
                  </Button>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="text-sm text-muted-foreground">Free ({freeSlots})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <span className="text-sm text-muted-foreground">Occupied ({occupiedSlots})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="text-sm text-muted-foreground">Reserved ({reservedSlots})</span>
              </div>
            </div>

            {totalSlots === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border/50">
                <ParkingSquare className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No parking slots configured</p>
                <p className="text-sm text-muted-foreground">Click Initialize Slots to create parking spaces</p>
              </div>
            ) : (
              <ParkingGrid
                slots={gridSlots}
                onSlotClick={(slot) => {
                  const apiSlot = slots?.find((s) => s.id.toString() === slot.id)
                  if (apiSlot) handleSlotClick(apiSlot)
                }}
                showDetails
                columns={4}
              />
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl border border-border/50 p-6 h-full">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Requests</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {requests?.slice(0, 8).map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between rounded-lg bg-secondary/30 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{request.visitor_name}</p>
                    <p className="text-xs text-muted-foreground">Flat {request.flat_number}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium capitalize",
                      request.status === "approved" && "bg-green-500/20 text-green-400",
                      request.status === "pending" && "bg-yellow-500/20 text-yellow-400",
                      request.status === "rejected" && "bg-red-500/20 text-red-400",
                      request.status === "entered" && "bg-blue-500/20 text-blue-400",
                      request.status === "exited" && "bg-gray-500/20 text-gray-400"
                    )}
                  >
                    {request.status}
                  </span>
                </motion.div>
              ))}
              {(!requests || requests.length === 0) && (
                <p className="text-center text-muted-foreground py-4">No recent requests</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Residents */}
        <div className="glass-card rounded-xl border border-border/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Residents</h3>
            <Users className="h-5 w-5 text-green-400" />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {residents?.map((resident, index) => (
              <motion.div
                key={resident.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between rounded-lg bg-secondary/30 p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{resident.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Flat {resident.flat} {resident.car_number && `| ${resident.car_number}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteResident(resident.id)}
                  className="text-muted-foreground hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
            {(!residents || residents.length === 0) && (
              <p className="text-center text-muted-foreground py-4">No residents found</p>
            )}
          </div>
        </div>

        {/* Guards */}
        <div className="glass-card rounded-xl border border-border/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Security Guards</h3>
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {guards?.map((guard, index) => (
              <motion.div
                key={guard.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between rounded-lg bg-secondary/30 p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{guard.name}</p>
                  <p className="text-sm text-muted-foreground">{guard.phone}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteGuard(guard.id)}
                  className="text-muted-foreground hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
            {(!guards || guards.length === 0) && (
              <p className="text-center text-muted-foreground py-4">No guards found</p>
            )}
          </div>
        </div>
      </div>

      {/* Slot Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Manage Slot {selectedSlot?.location}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">
                Status
              </label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof newStatus)}>
                <SelectTrigger className="border-border/50 bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/50 bg-popover">
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newStatus === "reserved" || newStatus === "occupied") && (
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">
                  Flat Number
                </label>
                <Input
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  placeholder="e.g., 203"
                  className="border-border/50 bg-secondary/50"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-border/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSlot}
                disabled={isUpdating}
                className="bg-cyan-500 text-white hover:bg-cyan-600"
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Update Slot
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
