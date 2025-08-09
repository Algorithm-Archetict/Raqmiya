import { Injectable } from '@angular/core';
import Swal from 'sweetalert2/dist/sweetalert2.esm.js';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private base = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  success(message: string, title?: string) {
    return this.base.fire({ icon: 'success', title: title || 'Success', text: message });
  }

  error(message: string, title?: string) {
    return this.base.fire({ icon: 'error', title: title || 'Error', text: message });
  }

  info(message: string, title?: string) {
    return this.base.fire({ icon: 'info', title: title || 'Info', text: message });
  }

  warning(message: string, title?: string) {
    return this.base.fire({ icon: 'warning', title: title || 'Warning', text: message });
  }
}
