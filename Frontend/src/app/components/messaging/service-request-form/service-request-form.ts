import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessagingHttpService } from '../../../core/services/messaging-http.service';

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-request-form.html',
  styleUrls: ['./service-request-form.css']
})
export class ServiceRequestFormComponent {
  @Input() conversationId!: string; // required
  @Output() submitted = new EventEmitter<{ id: string; conversationId: string; requirements: string; proposedBudget: number | null; status: string; deadlineUtc?: string | null }>();

  requirements = '';
  proposedBudget?: number | null = null;
  currency: 'USD' | 'EGP' = 'USD';
  readonly currencies: Array<{ code: 'USD' | 'EGP'; label: string; symbol: string }> = [
    { code: 'USD', label: 'US Dollar', symbol: '$' },
    { code: 'EGP', label: 'Egyptian Pound', symbol: 'E£' }
  ];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private http: MessagingHttpService) {}

  async submit() {
    this.error = null;
    this.success = null;

    const req = (this.requirements || '').trim();
    if (!req || req.length < 10) {
      this.error = 'Please describe your requirements (at least 10 characters).';
      return;
    }
    if (!this.conversationId) {
      this.error = 'Conversation is not available.';
      return;
    }

    this.loading = true;
    try {
      const res = await this.http.createServiceRequest(this.conversationId, req, this.proposedBudget ?? null, this.currency).toPromise();
      if (res) {
        const cur = this.currencies.find(c => c.code === this.currency)?.symbol || '';
        this.success = `Request sent${this.proposedBudget ? ` (budget: ${cur}${this.proposedBudget.toFixed(2)} ${this.currency})` : ''}.`;
        this.submitted.emit(res);
        // reset form
        this.requirements = '';
        this.proposedBudget = null;
        this.currency = 'USD';
      }
    } catch (e: any) {
      const msg = (e?.error?.message || e?.message || 'Failed to send request').toString();
      this.error = msg;
    } finally {
      this.loading = false;
    }
  }
}
