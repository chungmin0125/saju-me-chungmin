import { clearGuestResult, loadGuestResult } from './profile'

let guestResultAdoption = ''
let guestReadingInserted = false

export function takeGuestResult() {
  if (guestResultAdoption) return guestResultAdoption
  const stored = loadGuestResult()
  if (stored) {
    guestResultAdoption = stored
    clearGuestResult()
  }
  return guestResultAdoption
}

export function hasGuestReadingInserted() {
  return guestReadingInserted
}

export function markGuestReadingInserted() {
  guestReadingInserted = true
}
