import { GAME_CONFIG as C } from './config';
type PermissionOrientationEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
export class TiltController {
  enabled = localStorage.getItem('addball-tilt') !== 'off'; supported = 'DeviceOrientationEvent' in window;
  private neutral: { beta: number; gamma: number } | null = null; private raw = { beta: 0, gamma: 0 }; private filtered = { x: 0, y: 0 }; private degrees = { x: 0, y: 0 }; private listening = false;
  async activate(): Promise<boolean> {
    if (!this.supported || !this.enabled) return false;
    try { const ctor = DeviceOrientationEvent as PermissionOrientationEvent; if (ctor.requestPermission && await ctor.requestPermission() !== 'granted') return false; this.listen(); return true; } catch { return false; }
  }
  private listen(): void { if (this.listening) return; this.listening = true; window.addEventListener('deviceorientation', (e) => { if (e.beta == null || e.gamma == null) return; this.raw = { beta: e.beta, gamma: e.gamma }; if (!this.neutral) this.recalibrate(); }); }
  recalibrate(): void { this.neutral = { ...this.raw }; this.filtered = { x: 0, y: 0 }; }
  setEnabled(value: boolean): void { this.enabled = value; localStorage.setItem('addball-tilt', value ? 'on' : 'off'); if (value) void this.activate(); }
  gravity(): Matter.Vector {
    if (!this.enabled || !this.neutral) return { x: 0, y: 0 };
    let x = this.raw.gamma - this.neutral.gamma, y = this.raw.beta - this.neutral.beta; const angle = screen.orientation?.angle ?? 0;
    if (angle === 90) [x, y] = [y, -x]; else if (angle === 270 || angle === -90) [x, y] = [-y, x]; else if (angle === 180) [x, y] = [-x, -y];
    this.degrees = { x, y };
    const axis = (v: number) => Math.abs(v) < C.TILT_DEAD_ZONE ? 0 : Math.max(-C.TILT_CLAMP, Math.min(C.TILT_CLAMP, v)) / C.TILT_CLAMP;
    this.filtered.x += (axis(x) - this.filtered.x) * C.TILT_SMOOTHING; this.filtered.y += (axis(y) - this.filtered.y) * C.TILT_SMOOTHING;
    return { x: this.filtered.x * C.TILT_GRAVITY, y: this.filtered.y * C.TILT_GRAVITY };
  }
  reading(): { active: boolean; x: number; y: number; degreesX: number; degreesY: number } { return { active: this.enabled && this.neutral !== null, x: this.filtered.x, y: this.filtered.y, degreesX: this.degrees.x, degreesY: this.degrees.y }; }
}
