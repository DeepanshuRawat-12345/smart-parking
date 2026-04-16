import type {
  User,
  LoginRequest,
  LoginResponse,
  Slot,
  VisitorRequest,
  Resident,
  Guard,
  VisitRequestPayload,
  AddVehiclePayload,
  VerifyEntryPayload,
  ExitPayload,
  CreateSlotPayload,
  UpdateSlotPayload,
  ParkingStats,
} from "./types"

// Base API URL - connects to FastAPI backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  }

  const response = await fetch(url, config)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      errorData.detail || errorData.message || `HTTP error ${response.status}`
    )
  }

  return response.json()
}

// ==================== AUTH ====================

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return fetchApi<LoginResponse>("/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  })
}

export async function register(data: {
  username: string
  password: string
  role: string
  flat_number?: string
}): Promise<{ message: string }> {
  return fetchApi("/register", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ==================== PARKING SLOTS ====================

export async function getParkingStatus(): Promise<Slot[]> {
  return fetchApi<Slot[]>("/parking-status")
}

export async function getParkingStats(): Promise<ParkingStats> {
  const slots = await getParkingStatus()
  return {
    total_slots: slots.length,
    occupied_slots: slots.filter(s => s.status === "occupied").length,
    free_slots: slots.filter(s => s.status === "free").length,
    reserved_slots: slots.filter(s => s.is_reserved).length,
    visitor_slots: slots.filter(s => s.slot_type === "visitor").length,
    resident_slots: slots.filter(s => s.slot_type === "resident").length,
  }
}

export async function createSlots(count: number): Promise<{ message: string }> {
  return fetchApi("/create-slots", {
    method: "POST",
    body: JSON.stringify({ count }),
  })
}

export async function createSlot(data: CreateSlotPayload): Promise<Slot> {
  return fetchApi("/admin/slots", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateSlot(data: UpdateSlotPayload): Promise<Slot> {
  return fetchApi(`/admin/slots/${data.slot_id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteSlot(slotId: number): Promise<{ message: string }> {
  return fetchApi(`/admin/slots/${slotId}`, {
    method: "DELETE",
  })
}

// ==================== VISITOR REQUESTS ====================

export async function submitVisitRequest(
  data: VisitRequestPayload
): Promise<{ message: string; request_id: number }> {
  return fetchApi("/request-visit", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getVisitorRequests(): Promise<VisitorRequest[]> {
  return fetchApi<VisitorRequest[]>("/requests")
}

export async function getRequestsByFlat(flatNumber: string): Promise<VisitorRequest[]> {
  return fetchApi<VisitorRequest[]>(`/requests/${flatNumber}`)
}

export async function approveRequest(
  requestId: number
): Promise<{ message: string }> {
  return fetchApi("/approve-request", {
    method: "POST",
    body: JSON.stringify({ request_id: requestId }),
  })
}

export async function rejectRequest(
  requestId: number
): Promise<{ message: string }> {
  return fetchApi("/reject-request", {
    method: "POST",
    body: JSON.stringify({ request_id: requestId }),
  })
}

// ==================== GUARD OPERATIONS ====================

export async function addVehicle(
  data: AddVehiclePayload
): Promise<{ message: string }> {
  return fetchApi("/add-vehicle", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function verifyEntry(
  data: VerifyEntryPayload
): Promise<{ message: string; assigned_slot: string }> {
  return fetchApi("/verify-entry", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function processExit(
  requestId: number
): Promise<{ message: string }> {
  return fetchApi("/exit", {
    method: "POST",
    body: JSON.stringify({ request_id: requestId }),
  })
}

export async function scanPlate(
  file: File
): Promise<{ detected_plate: string }> {
  const formData = new FormData()
  formData.append("file", file)
  
  const url = `${API_BASE_URL}/scan-plate`
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      errorData.detail || errorData.message || `HTTP error ${response.status}`
    )
  }
  
  return response.json()
}

// ==================== ADMIN - RESIDENTS ====================

export async function getResidents(): Promise<Resident[]> {
  return fetchApi<Resident[]>("/admin/residents")
}

export async function addResident(data: Omit<Resident, "id">): Promise<Resident> {
  return fetchApi("/admin/residents", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateResident(
  id: number,
  data: Partial<Resident>
): Promise<Resident> {
  return fetchApi(`/admin/residents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteResident(id: number): Promise<{ message: string }> {
  return fetchApi(`/admin/residents/${id}`, {
    method: "DELETE",
  })
}

// ==================== ADMIN - GUARDS ====================

export async function getGuards(): Promise<Guard[]> {
  return fetchApi<Guard[]>("/admin/guards")
}

export async function addGuard(data: Omit<Guard, "id">): Promise<Guard> {
  return fetchApi("/admin/guards", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function deleteGuard(id: number): Promise<{ message: string }> {
  return fetchApi(`/admin/guards/${id}`, {
    method: "DELETE",
  })
}

// ==================== PREDICTIONS ====================

export async function getPredictedFreeSlots(): Promise<{
  slots: Slot[]
  prediction_time: string
}> {
  return fetchApi("/predict-free-slots")
}

// Export error class for error handling
export { ApiError }
