import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UnreadService {
  private readonly total$ = new BehaviorSubject<number>(0);
  private readonly messagesOnlyTotal$ = new BehaviorSubject<number>(0);
  private readonly perConversation = new Map<string, number>();
  private pendingRequestsCount = 0;
  private readonly storageKey = 'rq_unread_counts_v1';
  // in-memory dedupe of processed message IDs to prevent double-counting
  private processedMessageIds = new Set<string>();

  totalUnread$ = this.total$.asObservable();
  messagesTotal$ = this.messagesOnlyTotal$.asObservable();

  getTotal(): number { return this.total$.value; }
  getMessagesTotal(): number { return this.messagesOnlyTotal$.value; }

  getFor(conversationId: string): number { return this.perConversation.get(conversationId) || 0; }

  setFor(conversationId: string, count: number) {
    this.perConversation.set(conversationId, Math.max(0, count | 0));
    this.recompute();
  }

  increment(conversationId: string, by = 1) {
    const cur = this.perConversation.get(conversationId) || 0;
    this.perConversation.set(conversationId, Math.max(0, cur + by));
    this.recompute();
  }

  // Increment only once per unique message id (not persisted across reloads)
  incrementOnce(conversationId: string, messageId: string, by = 1) {
    if (!messageId) return;
    if (this.processedMessageIds.has(messageId)) return;
    this.processedMessageIds.add(messageId);
    this.increment(conversationId, by);
  }

  reset(conversationId: string) {
    if (this.perConversation.has(conversationId)) {
      this.perConversation.set(conversationId, 0);
      this.recompute();
    }
  }

  // Remove unread entries for conversations that no longer exist
  prune(validIds: string[]) {
    const valid = new Set(validIds || []);
    Array.from(this.perConversation.keys()).forEach(id => {
      if (!valid.has(id)) this.perConversation.delete(id);
    });
    this.recompute();
  }

  // Set count of pending message requests to include in total
  setPendingCount(count: number) {
    this.pendingRequestsCount = Math.max(0, count | 0);
    this.recompute();
  }

  private recompute() {
    let sum = 0;
    this.perConversation.forEach(v => sum += v || 0);
    // messages-only total excludes pending requests
    this.messagesOnlyTotal$.next(sum);
    // Include pending requests in the global total
    const total = sum + (this.pendingRequestsCount || 0);
    this.total$.next(total);
    this.persist();
  }

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const obj = JSON.parse(raw) as { perConversation?: Record<string, number>; pending?: number };
      const per = obj?.perConversation || {};
      Object.entries(per).forEach(([k, v]) => this.perConversation.set(k, Math.max(0, (v as number) | 0)));
      this.pendingRequestsCount = Math.max(0, (obj?.pending as number) | 0);
      this.recompute();
    } catch {}
  }

  private persist() {
    try {
      const perObj: Record<string, number> = {};
      this.perConversation.forEach((v, k) => { if (v && v > 0) perObj[k] = v; });
      const payload = { perConversation: perObj, pending: this.pendingRequestsCount };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {}
  }
}
