import { Component, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rf-preloader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rf-preloader" [class.fade-out]="fading()" *ngIf="visible()">
      <!-- Animated logo mark -->
      <div class="flex flex-col items-center gap-6">
        <div class="relative">
          <div class="w-14 h-14 rounded-2xl bg-brand-navy flex items-center justify-center shadow-xl">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="16" width="6" height="10" rx="1.5" fill="white" opacity="0.4"/>
              <rect x="11" y="10" width="6" height="16" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="20" y="2" width="6" height="24" rx="1.5" fill="white"/>
            </svg>
          </div>
          <!-- Orbit ring -->
          <div class="absolute -inset-2 rounded-full border-2 border-dashed border-brand-blue/20 animate-spin" style="animation-duration: 3s;"></div>
        </div>

        <div class="rf-preloader-logo">Report<span>Forge</span></div>
        <div class="rf-preloader-status">{{ statusText() }}</div>
      </div>

      <div class="rf-preloader-bar">
        <div class="rf-preloader-fill"></div>
      </div>

      <!-- Tech tagline -->
      <div class="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/40 mt-2">
        <span class="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
        ENGINE: DX-CORE-V2 · PRECISION ANALYTICS PLATFORM
      </div>
    </div>
  `,
})
export class PreloaderComponent implements OnInit {
  @Output() loaded = new EventEmitter<void>();
  visible = signal(true);
  fading = signal(false);

  readonly STEPS = [
    'Initializing engine...',
    'Loading schema metadata...',
    'Connecting to data sources...',
    'Preparing query builder...',
    'Ready',
  ];
  statusText = signal(this.STEPS[0]);

  ngOnInit() {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < this.STEPS.length) {
        this.statusText.set(this.STEPS[step]);
      } else {
        clearInterval(interval);
      }
    }, 380);

    // Total preloader time: ~1.9 seconds
    setTimeout(() => {
      this.fading.set(true);
      setTimeout(() => {
        this.visible.set(false);
        this.loaded.emit();
      }, 420);
    }, 1900);
  }
}
