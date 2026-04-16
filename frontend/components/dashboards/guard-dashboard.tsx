"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR, { mutate } from "swr"
import {
  Camera,
  Car,
  CheckCircle,
  LogIn,
  LogOut,
  Scan,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Upload,
  X,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ParkingGrid } from "@/components/parking-grid"
import { cn } from "@/lib/utils"
import {
  getParkingStatus,
  getVisitorRequests,
  addVehicle,
  verifyEntry,
  processExit,
  scanPlate,
} from "@/lib/api"
import type { VisitorRequest } from "@/lib/types"

export function GuardDashboard() {
  // Fetch data using SWR - refreshes every 5 seconds for real-time updates
  const { data: slots, isLoading: slotsLoading } = useSWR(
    "parking-status", 
    getParkingStatus,
    { refreshInterval: 5000 }
  )
  const { data: requests } = useSWR(
    "requests", 
    getVisitorRequests,
    { refreshInterval: 5000 }
  )

  // State for OCR scanning
  const [isScanning, setIsScanning] = useState(false)
  const [detectedPlate, setDetectedPlate] = useState("")
  const [manualPlate, setManualPlate] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State for request selection - MANDATORY before any action
  const [selectedRequest, setSelectedRequest] = useState<VisitorRequest | null>(null)
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Computed values from fetched data
  const freeSlots = slots?.filter((s) => s.status === "free") || []
  const approvedRequests = requests?.filter((r) => r.status === "approved") || []
  const enteredRequests = requests?.filter((r) => r.status === "entered") || []

  // Auto-clear action message after 5 seconds
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [actionMessage])

  // Refresh all data from backend
  const refreshAllData = async () => {
    await Promise.all([
      mutate("parking-status"),
      mutate("requests")
    ])
  }

  // Handle image file selection for OCR
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setDetectedPlate("")
    }
  }

  // Clear selected image
  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setDetectedPlate("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // OCR scan - calls backend /scan-plate API with file upload
  const handleScan = async () => {
    if (!selectedImage) {
      setActionMessage({ type: "error", text: "Please select an image first" })
      return
    }

    setIsScanning(true)
    setDetectedPlate("")
    setActionMessage(null)

    try {
      // Call backend OCR API
      const result = await scanPlate(selectedImage)
      const plate = result.detected_plate
      setDetectedPlate(plate)
      
      // Auto-match: Find approved request with matching vehicle_number
      const matchingRequest = approvedRequests.find(
        (r) => r.vehicle_number?.toUpperCase().replace(/[\s-]/g, "") === plate.toUpperCase().replace(/[\s-]/g, "")
      )
      
      if (matchingRequest) {
        // Auto-select the matching request
        setSelectedRequest(matchingRequest)
        setActionMessage({ 
          type: "success", 
          text: `Plate detected: ${plate} - Auto-matched with request #${matchingRequest.id} for ${matchingRequest.visitor_name} (Flat ${matchingRequest.flat_number})` 
        })
      } else {
        // Clear any previously selected request when no match found
        setSelectedRequest(null)
        setActionMessage({ 
          type: "error", 
          text: `Plate detected: ${plate} - No matching request found. Please verify the vehicle number or select a request manually.` 
        })
      }
    } catch (error) {
      setActionMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to scan plate. Try manual entry." 
      })
    } finally {
      setIsScanning(false)
    }
  }

  // Handle manual plate entry - also tries to auto-match
  const handleManualPlateChange = (value: string) => {
    const plate = value.toUpperCase()
    setManualPlate(plate)
    
    // Try to auto-match with approved requests
    if (plate.length >= 4) {
      const matchingRequest = approvedRequests.find(
        (r) => r.vehicle_number?.toUpperCase().replace(/[\s-]/g, "") === plate.replace(/[\s-]/g, "")
      )
      if (matchingRequest && selectedRequest?.id !== matchingRequest.id) {
        setSelectedRequest(matchingRequest)
        setActionMessage({
          type: "success",
          text: `Auto-matched with request #${matchingRequest.id} for ${matchingRequest.visitor_name}`
        })
      }
    }
  }

  // Verify entry - REQUIRES selected request
  const handleVerifyEntry = async () => {
    // Validation: Must have selected request
    if (!selectedRequest) {
      setActionMessage({ type: "error", text: "Please select an approved request first" })
      return
    }

    // Get plate number from OCR or manual entry
    const plateNumber = detectedPlate || manualPlate
    if (!plateNumber) {
      setActionMessage({ type: "error", text: "Please scan or enter a vehicle number" })
      return
    }

    // Check for available slots
    if (freeSlots.length === 0) {
      setActionMessage({ type: "error", text: "No free parking slots available" })
      return
    }

    setIsProcessing(true)
    setActionMessage(null)

    try {
      // Step 1: Add vehicle details if not already set on the request
      if (!selectedRequest.vehicle_number || selectedRequest.vehicle_number !== plateNumber) {
        await addVehicle({
          request_id: selectedRequest.id,  // Uses dynamic request.id
          vehicle_number: plateNumber,
          vehicle_type: "car",
        })
      }

      // Step 2: Verify entry and assign slot using request_id
      const result = await verifyEntry({ 
        request_id: selectedRequest.id  // Uses dynamic request.id
      })
      
      setActionMessage({ 
        type: "success", 
        text: `ENTRY VERIFIED: ${selectedRequest.visitor_name} (Request #${selectedRequest.id}) | Vehicle: ${plateNumber} | Assigned Slot: ${result.assigned_slot} | Visiting Flat: ${selectedRequest.flat_number}` 
      })
      
      // Step 3: Refresh parking grid and requests from backend
      await refreshAllData()
      
      // Step 4: Clear form state
      setDetectedPlate("")
      setManualPlate("")
      setSelectedRequest(null)
      clearImage()
    } catch (error) {
      setActionMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to verify entry" 
      })
      // Still refresh data to ensure UI is in sync
      await refreshAllData()
    } finally {
      setIsProcessing(false)
    }
  }

  // Process vehicle exit using the SAME request_id from entry
  const handleVehicleExit = async (request: VisitorRequest) => {
    if (!request.id) {
      setActionMessage({ type: "error", text: "Invalid request - no ID found" })
      return
    }

    // Store values before processing for confirmation message
    const visitorName = request.visitor_name
    const vehicleNumber = request.vehicle_number || "Unknown"
    const slotNumber = request.assigned_slot || "Unknown"
    const requestId = request.id

    setIsProcessing(true)
    setActionMessage(null)

    try {
      // Call exit API with the request_id (same one used during entry)
      await processExit(requestId)
      
      setActionMessage({ 
        type: "success", 
        text: `Vehicle ${vehicleNumber} exited from Slot ${slotNumber}. Visitor: ${visitorName} (Request #${requestId}). Slot is now FREE.` 
      })
      
      // Refresh parking grid and requests from backend
      await refreshAllData()
    } catch (error) {
      setActionMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to process exit" 
      })
      // Still refresh data to ensure UI is in sync
      await refreshAllData()
    } finally {
      setIsProcessing(false)
    }
  }

  // Select a request from the approved list
  const handleSelectRequest = (request: VisitorRequest) => {
    setSelectedRequest(request)
    // If request has vehicle number, pre-fill manual plate field
    if (request.vehicle_number) {
      setManualPlate(request.vehicle_number)
    }
    setActionMessage({
      type: "success",
      text: `Selected request #${request.id} for ${request.visitor_name} visiting Flat ${request.flat_number}`
    })
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
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
            <div className="flex items-start gap-2">
              {actionMessage.type === "success" ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Section - OCR Panel & Request Selection */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* OCR Scanner Panel */}
        <div className="glass-card relative overflow-hidden rounded-xl border border-border/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-foreground">
                License Plate Scanner (OCR)
              </h2>
            </div>
            <motion.div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isScanning ? "bg-yellow-400" : "bg-green-400"
              )}
              animate={isScanning ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </div>

          {/* Image Upload Area */}
          <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-secondary/50">
            {imagePreview ? (
              <div className="relative h-full w-full">
                <img 
                  src={imagePreview} 
                  alt="License plate" 
                  className="h-full w-full object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearImage}
                  className="absolute right-2 top-2 bg-background/80 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {isScanning && (
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    initial={{ top: "0%" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{ boxShadow: "0 0 20px rgba(34, 211, 238, 0.8)" }}
                  />
                )}
              </div>
            ) : (
              <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-gradient-to-br from-secondary to-secondary/50 hover:bg-secondary/70 transition-colors">
                <Upload className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload license plate image</p>
                <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG up to 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}

            {/* Corner markers */}
            <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-cyan-400 pointer-events-none" />
            <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

            {/* Detected Plate Overlay */}
            <AnimatePresence>
              {detectedPlate && !isScanning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-4 left-4 right-4 flex items-center justify-center rounded-lg bg-background/90 backdrop-blur-sm p-3"
                >
                  <CheckCircle className="mr-2 h-5 w-5 text-green-400" />
                  <span className="text-sm text-muted-foreground mr-2">Detected:</span>
                  <span className="font-mono text-lg font-bold text-green-400">
                    {detectedPlate}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            onClick={handleScan}
            disabled={isScanning || !selectedImage}
            className="w-full bg-cyan-500 text-white hover:bg-cyan-600"
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan className="mr-2 h-4 w-4" />
                Scan Plate
              </>
            )}
          </Button>
        </div>

        {/* Entry Verification Panel */}
        <div className="glass-card rounded-xl border border-border/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Entry Verification
            </h2>
            <Button variant="ghost" size="sm" onClick={refreshAllData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Manual Vehicle Number Entry */}
          <div className="mb-4 space-y-2">
            <label className="text-sm text-muted-foreground">
              Vehicle Number (OCR or Manual)
            </label>
            <Input
              value={detectedPlate || manualPlate}
              onChange={(e) => handleManualPlateChange(e.target.value)}
              placeholder="e.g., DL-01-AB-1234"
              className="border-border/50 bg-secondary/50 font-mono"
            />
            {detectedPlate && (
              <p className="text-xs text-green-400">
                OCR Detected - you can edit if needed
              </p>
            )}
          </div>

          {/* Approved Requests Selection - MANDATORY */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">
              Select Approved Request <span className="text-red-400">*</span> ({approvedRequests.length} pending)
            </label>
            <div className="max-h-40 overflow-y-auto space-y-2 border border-border/30 rounded-lg p-2 bg-secondary/20">
              {approvedRequests.map((request) => (
                <motion.div
                  key={request.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                    selectedRequest?.id === request.id 
                      ? "bg-cyan-500/20 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                      : "bg-secondary/30 hover:bg-secondary/50 border border-transparent"
                  )}
                  onClick={() => handleSelectRequest(request)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">#{request.id}</span>
                      <p className="text-sm font-medium text-foreground">{request.visitor_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Flat {request.flat_number} | {request.phone}
                    </p>
                    {request.vehicle_number && (
                      <p className="text-xs font-mono text-cyan-400 mt-1">
                        Vehicle: {request.vehicle_number}
                      </p>
                    )}
                  </div>
                  {selectedRequest?.id === request.id ? (
                    <UserCheck className="h-5 w-5 flex-shrink-0 ml-2 text-cyan-400" />
                  ) : (
                    <CheckCircle className="h-5 w-5 flex-shrink-0 ml-2 text-green-400/50" />
                  )}
                </motion.div>
              ))}
              {approvedRequests.length === 0 && (
                <div className="text-sm text-center py-8 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-yellow-400/70" />
                  <p className="text-yellow-400 font-medium">No Approved Requests</p>
                  <p className="text-muted-foreground text-xs mt-2 max-w-xs mx-auto">
                    There are no visitor requests awaiting entry verification. 
                    Requests must first be approved by residents before guards can verify entry.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Request Panel - VERY IMPORTANT UI */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block font-medium">
              Selected Request Panel
            </label>
            {selectedRequest ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-lg bg-cyan-500/10 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-cyan-400" />
                    <span className="text-sm text-cyan-400 font-bold uppercase tracking-wide">Selected Request</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(null)
                      setManualPlate("")
                    }}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Visitor Name:</span>
                    <span className="text-foreground font-semibold">{selectedRequest.visitor_name}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Flat Number:</span>
                    <span className="text-foreground font-semibold">{selectedRequest.flat_number}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Vehicle Number:</span>
                    <span className="text-cyan-400 font-mono font-semibold">{selectedRequest.vehicle_number || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-foreground">{selectedRequest.phone}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                    <span className="text-muted-foreground">Request ID:</span>
                    <span className="text-foreground font-mono">#{selectedRequest.id}</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="p-4 rounded-lg bg-secondary/30 border-2 border-dashed border-border/50 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-400/70" />
                <p className="text-sm text-muted-foreground">No request selected</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Select an approved request above or scan a plate to auto-match</p>
              </div>
            )}
          </div>

          {/* Verify Entry Button */}
          <Button
            onClick={handleVerifyEntry}
            disabled={
              !selectedRequest || 
              (!detectedPlate && !manualPlate) || 
              freeSlots.length === 0 || 
              isProcessing
            }
            className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Verify Entry & Assign Slot
          </Button>

          {/* Validation Messages - show why button is disabled */}
          <div className="mt-2 space-y-1">
            {!selectedRequest && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Select an approved request first (mandatory)
              </p>
            )}
            {selectedRequest && !detectedPlate && !manualPlate && (
              <p className="text-xs text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Scan or enter a vehicle number
              </p>
            )}
            {freeSlots.length === 0 && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                No free parking slots available
              </p>
            )}
          </div>

          {/* Available Slots Counter */}
          <div className="mt-4 rounded-lg bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Slots</span>
              <span className={cn(
                "text-2xl font-bold",
                freeSlots.length > 3 ? "text-green-400" : freeSlots.length > 0 ? "text-yellow-400" : "text-red-400"
              )}>
                {freeSlots.length}
              </span>
            </div>
            {freeSlots.length === 0 && (
              <div className="mt-2 flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Parking full - cannot verify new entries</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Parked Vehicles & Parking Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Currently Parked Vehicles - Exit Management */}
        <div className="glass-card rounded-xl border border-border/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Parked Vehicles ({enteredRequests.length})
            </h3>
            <Button variant="ghost" size="icon" onClick={refreshAllData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {enteredRequests.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3"
              >
                <div className="rounded-lg p-2 bg-blue-500/20">
                  <Car className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">#{entry.id}</span>
                    <p className="font-mono text-sm text-foreground truncate">
                      {entry.vehicle_number || "No plate"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.visitor_name} | Flat {entry.flat_number}
                  </p>
                  <p className="text-xs text-cyan-400">
                    Slot: {entry.assigned_slot || "N/A"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVehicleExit(entry)}
                  disabled={isProcessing}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Exit
                </Button>
              </motion.div>
            ))}
            {enteredRequests.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-secondary/20 rounded-lg">
                <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No vehicles currently parked</p>
              </div>
            )}
          </div>
        </div>

        {/* Parking Grid - Real-time Status */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl border border-border/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Real-Time Parking Status</h3>
                <p className="text-sm text-muted-foreground">Live data from /parking-status API</p>
              </div>
              <Button variant="ghost" size="sm" onClick={refreshAllData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="text-sm text-muted-foreground">Free ({freeSlots.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <span className="text-sm text-muted-foreground">
                  Occupied ({slots?.filter(s => s.status === "occupied").length || 0})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="text-sm text-muted-foreground">
                  Reserved ({slots?.filter(s => s.status === "reserved").length || 0})
                </span>
              </div>
            </div>

            {gridSlots.length > 0 ? (
              <ParkingGrid
                slots={gridSlots}
                showDetails
                columns={4}
              />
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border/50">
                <Car className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No parking slots available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
