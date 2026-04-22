import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../core/services/report.service';

@Component({
  selector: 'rf-embed-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-slate-50/30 anim-fade">
      <!-- Standardized Compact Header -->
      <header class="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <div class="flex items-center gap-3">
           <span class="material-icons text-slate-900 text-lg">code</span>
           <h1 class="text-sm font-black text-slate-900 tracking-tight uppercase">Embed Distribution</h1>
        </div>
      </header>

      <!-- Main Content -->
      <div class="flex-1 p-8 overflow-y-auto custom-scrollbar">
         <div class="max-w-4xl mx-auto flex flex-col gap-8">
            
            <!-- Asset Selection -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
               <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                 Asset Catalog
               </h3>
               
               <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                 @for (report of reports(); track report.id) {
                    <button 
                      class="p-4 border rounded-xl text-left transition-all relative overflow-hidden group"
                      [class.border-brand-primary]="selectedReportId() === report.id"
                      [class.bg-slate-50]="selectedReportId() === report.id"
                      [class.border-slate-200]="selectedReportId() !== report.id"
                      [class.hover:border-slate-300]="selectedReportId() !== report.id"
                      (click)="selectedReportId.set(report.id!)">
                       
                       <div class="flex flex-col gap-1 z-10 relative">
                          <span class="text-[11px] font-black text-slate-800 truncate">{{ report.name }}</span>
                          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{{ report.category }}</span>
                       </div>
                       
                       @if (selectedReportId() === report.id) {
                          <div class="absolute top-0 right-0 p-1 bg-brand-primary rounded-bl-lg">
                             <span class="material-icons text-white text-[12px]">check</span>
                          </div>
                       }
                    </button>
                 }
                 @if (reports().length === 0) {
                    <div class="col-span-full py-12 text-center">
                       <span class="material-icons text-slate-200 text-4xl block mb-2">folder_off</span>
                       <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">No distributable assets</span>
                    </div>
                 }
               </div>
            </div>

            <!-- Snippet Generation -->
            @if (selectedReport()) {
               <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6 anim-fade">
                 <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   Integration Snippets
                 </h3>
                 
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Web Component snippet -->
                    <div class="flex flex-col gap-3">
                       <div class="flex justify-between items-center">
                          <span class="text-[10px] font-black text-slate-500 uppercase">Web Component (SDK)</span>
                          <button class="rf-compact-btn-ghost h-6 px-2 text-[9px]" (click)="copy(webComponentSnippet())">COPY</button>
                       </div>
                       <div class="relative group">
                          <pre class="bg-slate-900 text-slate-300 p-4 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{{ webComponentSnippet() }}</pre>
                       </div>
                       <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Requires ReportForge.js to be initialized in host.</p>
                    </div>

                    <!-- IFrame Snippet -->
                    <div class="flex flex-col gap-3">
                       <div class="flex justify-between items-center">
                          <span class="text-[10px] font-black text-slate-500 uppercase">Secure iFrame</span>
                          <button class="rf-compact-btn-ghost h-6 px-2 text-[9px]" (click)="copy(iframeSnippet())">COPY</button>
                       </div>
                       <div class="relative group">
                          <pre class="bg-slate-900 text-slate-300 p-4 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{{ iframeSnippet() }}</pre>
                       </div>
                       <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Standard sandboxed container. Zero-dependency.</p>
                    </div>
                 </div>
               </div>
            }

         </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class EmbedManagerComponent {
  reportService = inject(ReportService);
  
  selectedReportId = signal<string | null>(null);
  
  reports = computed(() => this.reportService.reports());
  
  selectedReport = computed(() => {
     const id = this.selectedReportId();
     if (!id) return null;
     return this.reports().find(r => r.id === id);
  });

  webComponentSnippet = computed(() => {
     const report = this.selectedReport();
     if (!report) return '';
     return `<rf-report-embed 
  report-id="${report.id}" 
  theme="slate" 
  width="100%" 
  height="600px">
</rf-report-embed>`;
  });

  iframeSnippet = computed(() => {
     const report = this.selectedReport();
     if (!report) return '';
     const domain = window.location.origin;
     return `<iframe 
  src="${domain}/embed/${report.id}" 
  width="100%" 
  height="600" 
  frameborder="0" 
  allow="fullscreen">
</iframe>`;
  });

  copy(text: string) {
     navigator.clipboard.writeText(text);
  }
}
