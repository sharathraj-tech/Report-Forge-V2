import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../core/services/report.service';

@Component({
  selector: 'rf-embed-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-[#f8fafc] font-sans">
      <!-- Header -->
      <div class="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
        <div>
           <h2 class="text-lg font-black text-slate-800 tracking-tight leading-none">Embed Manager</h2>
           <p class="text-[11px] text-slate-500 font-medium mt-1">Generate drop-in snippets for existing applications.</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 p-8 overflow-y-auto">
         <div class="max-w-4xl mx-auto flex flex-col gap-8">
            
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
               <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span class="material-icons text-indigo-500">list_alt</span> Select Report
               </h3>
               
               <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                 @for (report of reports(); track report.id) {
                    <button 
                      class="p-4 border rounded-xl text-left transition-all relative overflow-hidden group"
                      [class.border-indigo-500]="selectedReportId() === report.id"
                      [class.bg-indigo-50]="selectedReportId() === report.id"
                      [class.border-slate-200]="selectedReportId() !== report.id"
                      [class.hover:border-slate-300]="selectedReportId() !== report.id"
                      (click)="selectedReportId.set(report.id!)">
                       
                       <div class="flex flex-col gap-1 z-10 relative">
                          <span class="text-xs font-bold text-slate-800 truncate">{{ report.name }}</span>
                          <span class="text-[10px] text-slate-500 uppercase">{{ report.category }}</span>
                       </div>
                       
                       @if (selectedReportId() === report.id) {
                          <div class="absolute top-0 right-0 p-1 bg-indigo-500 rounded-bl-lg">
                             <span class="material-icons text-white text-[12px]">check</span>
                          </div>
                       }
                    </button>
                 }
                 @if (reports().length === 0) {
                    <div class="col-span-full py-8 text-center text-slate-400 text-sm">
                       No reports available to embed.
                    </div>
                 }
               </div>
            </div>

            @if (selectedReport()) {
               <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-6 anim-fade">
                 <div class="flex items-center justify-between">
                    <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <span class="material-icons text-emerald-500">code</span> Embed Snippets
                    </h3>
                 </div>
                 
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Web Component snippet -->
                    <div class="flex flex-col gap-2">
                       <div class="flex justify-between items-center">
                          <span class="text-[11px] font-bold text-slate-600 uppercase">Web Component</span>
                          <button class="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold" (click)="copy(webComponentSnippet())">COPY</button>
                       </div>
                       <pre class="bg-slate-900 text-slate-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">{{ webComponentSnippet() }}</pre>
                       <p class="text-[10px] text-slate-400 mt-1">Requires ReportForge client SDK to be loaded.</p>
                    </div>

                    <!-- IFrame Snippet -->
                    <div class="flex flex-col gap-2">
                       <div class="flex justify-between items-center">
                          <span class="text-[11px] font-bold text-slate-600 uppercase">iFrame</span>
                          <button class="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold" (click)="copy(iframeSnippet())">COPY</button>
                       </div>
                       <pre class="bg-slate-900 text-slate-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">{{ iframeSnippet() }}</pre>
                       <p class="text-[10px] text-slate-400 mt-1">Direct embedding without dependencies.</p>
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
    .anim-fade { animation: fade-in 0.3s ease-out; }
    @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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
  theme="light" 
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
