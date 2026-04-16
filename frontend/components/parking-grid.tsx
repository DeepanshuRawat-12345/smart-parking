"use client"

import { motion } from "framer-motion"
import { SlotCard, type SlotStatus } from "./slot-card"

export interface ParkingSlot {
  id: string
  slotNumber: string
  status: SlotStatus
  vehicleNumber?: string
  ownerFlat?: string
  slotType?: "resident" | "visitor" | "general"
}

interface ParkingGridProps {
  slots: ParkingSlot[]
  onSlotClick?: (slot: ParkingSlot) => void
  showDetails?: boolean
  columns?: 3 | 4 | 6
}

export function ParkingGrid({
  slots,
  onSlotClick,
  showDetails = false,
  columns = 4,
}: ParkingGridProps) {
  const gridCols = {
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`grid gap-4 ${gridCols[columns]}`}
    >
      {slots.map((slot, index) => (
        <motion.div
          key={slot.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <SlotCard
            slotNumber={slot.slotNumber}
            status={slot.status}
            vehicleNumber={slot.vehicleNumber}
            ownerFlat={slot.ownerFlat}
            onClick={onSlotClick ? () => onSlotClick(slot) : undefined}
            showDetails={showDetails}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
