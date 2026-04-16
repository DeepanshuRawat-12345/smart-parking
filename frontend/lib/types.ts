// Types matching the backend models

export type UserRole = "admin" | "guard" | "resident" | "visitor"

export interface User {
  id: number
  username: string
  role: UserRole
  flat_number?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  message: string
  user: User
}

export interface Slot {
  id: number
  location: string
  status: "free" | "occupied" | "reserved"
  slot_type: "resident" | "visitor" | "general"
  is_reserved: boolean
  owner_flat?: string
  vehicle_number?: string
}

export interface VisitorRequest {
  id: number
  visitor_name: string
  phone: string
  flat_number: string
  status: "pending" | "approved" | "rejected" | "entered" | "exited"
  vehicle_number?: string
  vehicle_type?: string
  assigned_slot?: string
  entry_time?: string
  exit_time?: string
  created_at: string
}

export interface Resident {
  id: number
  name: string
  flat: string
  phone: string
  car_number?: string
  car_type?: string
  avg_exit_time?: string
  avg_entry_time?: string
}

export interface Guard {
  id: number
  name: string
  phone: string
}

export interface Vehicle {
  vehicle_number: string
  vehicle_type: string
  owner_name?: string
  flat_number?: string
}

export interface ActivityLog {
  id: string
  type: "entry" | "exit" | "request" | "approved" | "rejected" | "alert"
  message: string
  timestamp: string
  vehicle?: string
  slot?: string
}

export interface ParkingStats {
  total_slots: number
  occupied_slots: number
  free_slots: number
  reserved_slots: number
  visitor_slots: number
  resident_slots: number
}

// API Request types
export interface VisitRequestPayload {
  visitor_name: string
  phone: string
  flat_number: string
  vehicle_number?: string
  vehicle_type?: string
}

export interface AddVehiclePayload {
  request_id: number
  vehicle_number: string
  vehicle_type: string
}

export interface VerifyEntryPayload {
  request_id: number
}

export interface ExitPayload {
  request_id: number
}

export interface CreateSlotPayload {
  location: string
  slot_type: "resident" | "visitor" | "general"
  owner_flat?: string
}

export interface UpdateSlotPayload {
  slot_id: number
  status?: "free" | "occupied" | "reserved"
  slot_type?: "resident" | "visitor" | "general"
  owner_flat?: string
}
