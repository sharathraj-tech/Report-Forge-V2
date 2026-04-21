import { Injectable } from '@angular/core';
import notify from 'devextreme/ui/notify';
import { confirm } from 'devextreme/ui/dialog';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  
  /**
   * Shows a toast message (DevExtreme Notify)
   */
  notify(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', displayTime: number = 3000) {
    notify({
      message,
      type,
      displayTime,
      position: { at: 'top right', my: 'top right', offset: '-20 20' },
      width: 350
    });
  }

  success(message: string) { this.notify(message, 'success'); }
  error(message: string) { this.notify(message, 'error', 5000); }
  warning(message: string) { this.notify(message, 'warning', 4000); }
  info(message: string) { this.notify(message, 'info'); }

  /**
   * Shows a confirmation dialog (DevExtreme Confirm)
   */
  async confirm(message: string, title: string = 'Confirm Action'): Promise<boolean> {
    return await confirm(message, title);
  }
}
