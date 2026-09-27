import { EventEmitter } from 'node:events'
import type { DigestRecord, OverlayState, TrayBusyState } from '../shared/types'

class AppEvents extends EventEmitter {
  jobsUpdated(jobs: DigestRecord[]): void {
    this.emit('jobs-updated', jobs)
  }

  overlayUpdated(state: OverlayState): void {
    this.emit('overlay-updated', state)
  }

  trayState(state: TrayBusyState): void {
    this.emit('tray-state', state)
  }
}

export const appEvents = new AppEvents()
