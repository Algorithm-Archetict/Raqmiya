import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: number;
  body: string;
  type: string;
  createdAt: string;
}

export interface ConversationUpdate {
  id: string;
  creatorId: number;
  customerId: number;
  status: string;
  createdAt?: string;
}

export interface ServiceRequestUpdate {
  id: string;
  conversationId: string;
  requirements?: string;
  proposedBudget?: number | null;
  status: string;
  deadlineUtc?: string | null;
}

export interface DeliveryUpdate {
  id: string;
  conversationId: string;
  serviceRequestId?: string | null;
  productId?: number;
  price?: number;
  status: string;
  createdAt?: string;
}

export interface ConversationDeletedEvent { id: string }

export interface DeadlineProposalEvent {
  conversationId: string;
  serviceRequestId: string;
  proposal: {
    id: string;
    serviceRequestId: string;
    proposedDeadlineUtc: string;
    status: string;
    createdAt: string;
    reason?: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class ChatSignalRService {
  private hub?: signalR.HubConnection;
  private baseUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly hubUrl = this.baseUrl.replace(/\/api$/, '') + '/hubs/chat';
  private joinedConversations = new Set<string>();

  // streams
  readonly messages$ = new BehaviorSubject<ChatMessage | null>(null);
  readonly conversation$ = new BehaviorSubject<ConversationUpdate | null>(null);
  readonly serviceRequest$ = new BehaviorSubject<ServiceRequestUpdate | null>(null);
  readonly delivery$ = new BehaviorSubject<DeliveryUpdate | null>(null);
  readonly connectionState$ = new BehaviorSubject<'disconnected'|'connecting'|'connected'>('disconnected');
  readonly typing$ = new BehaviorSubject<{ conversationId: string; userId: number; at: string } | null>(null);
  readonly messageSeen$ = new BehaviorSubject<{ conversationId: string; messageId: string; seenByUserId: number; at: string } | null>(null);
  readonly presence$ = new BehaviorSubject<{ userId: number; online: boolean } | null>(null);
  readonly onlineUsers$ = new BehaviorSubject<number[] | null>(null);
  readonly conversationDeleted$ = new BehaviorSubject<ConversationDeletedEvent | null>(null);
  readonly deadlineProposal$ = new BehaviorSubject<DeadlineProposalEvent | null>(null);

  constructor(private zone: NgZone) { this.init(); }

  private getToken(): string | null {
    return (
      localStorage.getItem('authToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('access_token')
    );
  }

  async typing(conversationId: string) {
    await this.ensureConnected();
    return this.ensureHub().invoke('Typing', conversationId).catch((err: any) => { throw this.formatHubError(err); });
  }

  async markSeen(conversationId: string, messageId: string) {
    await this.ensureConnected();
    return this.ensureHub().invoke('MarkSeen', conversationId, messageId).catch((err: any) => { throw this.formatHubError(err); });
  }

  private init() {
    this.connectionState$.next('connecting');
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, { accessTokenFactory: () => this.getToken() ?? '' })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => 2000 })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hub.onreconnected(async () => {
      this.zone.run(() => this.connectionState$.next('connected'));
      // Rejoin all previously joined conversation groups
      try {
        const ids = Array.from(this.joinedConversations);
        for (const id of ids) {
          try { await this.ensureHub().invoke('JoinConversationGroup', id); } catch {}
        }
      } catch {}
    });
    this.hub.onreconnecting(() => this.zone.run(() => this.connectionState$.next('connecting')));
    this.hub.onclose(() => this.zone.run(() => this.connectionState$.next('disconnected')));

    // server events
    this.hub.on('ReceiveMessage', (m: ChatMessage) => this.zone.run(() => {
      try { console.debug('[SignalR] ReceiveMessage', m); } catch {}
      this.messages$.next(m);
    }));
    this.hub.on('ConversationUpdated', (c: ConversationUpdate) => this.zone.run(() => this.conversation$.next(c)));
    this.hub.on('ConversationDeleted', (e: ConversationDeletedEvent) => this.zone.run(() => this.conversationDeleted$.next(e)));
    this.hub.on('ServiceRequestUpdated', (s: ServiceRequestUpdate) => this.zone.run(() => this.serviceRequest$.next(s)));
    this.hub.on('DeliveryUpdated', (d: DeliveryUpdate) => this.zone.run(() => this.delivery$.next(d)));
    this.hub.on('DeadlineProposalUpdated', (e: DeadlineProposalEvent) => this.zone.run(() => this.deadlineProposal$.next(e)));
    this.hub.on('Typing', (e: any) => this.zone.run(() => this.typing$.next({
      conversationId: String(e?.conversationId), userId: Number(e?.userId), at: e?.at || new Date().toISOString()
    })));
    this.hub.on('MessageSeen', (e: any) => this.zone.run(() => this.messageSeen$.next({
      conversationId: String(e?.conversationId), messageId: String(e?.messageId), seenByUserId: Number(e?.seenByUserId), at: e?.at || new Date().toISOString()
    })));
    this.hub.on('UserPresenceChanged', (e: any) => this.zone.run(() => this.presence$.next({
      userId: Number(e?.userId), online: !!e?.online
    })));

    this.hub.start()
      .then(() => this.zone.run(() => this.connectionState$.next('connected')))
      .catch(() => this.zone.run(() => this.connectionState$.next('disconnected')));
  }

  // helpers
  private ensureHub(): signalR.HubConnection { if (!this.hub) throw new Error('Hub not initialized'); return this.hub; }

  private async ensureConnected(): Promise<void> {
    const hub = this.ensureHub();
    const state = hub.state;
    if (state === signalR.HubConnectionState.Connected) return;
    if (state === signalR.HubConnectionState.Disconnected) {
      try {
        await hub.start();
        this.zone.run(() => this.connectionState$.next('connected'));
        return;
      } catch {
        this.zone.run(() => this.connectionState$.next('disconnected'));
        throw new Error('Unable to connect to chat service. Please try again.');
      }
    } else {
      // Connecting or Reconnecting: briefly wait; if it settles not disconnected, proceed
      await new Promise(res => setTimeout(res, 300));
      if (hub.state !== signalR.HubConnectionState.Disconnected) return;
      // If it fell back to disconnected, try start once
      try {
        await hub.start();
        this.zone.run(() => this.connectionState$.next('connected'));
      } catch {
        this.zone.run(() => this.connectionState$.next('disconnected'));
        throw new Error('Unable to connect to chat service. Please try again.');
      }
    }
  }

  async joinConversationGroup(conversationId: string) {
    await this.ensureConnected();
    const id = String(conversationId).trim().toLowerCase();
    this.joinedConversations.add(id);
    return this.ensureHub().invoke('JoinConversationGroup', id);
  }
  async getOnlineUsers(): Promise<number[]> {
    await this.ensureConnected();
    const list = await this.ensureHub().invoke<number[]>('GetOnlineUsers');
    this.zone.run(() => this.onlineUsers$.next(list));
    return list;
  }
  async sendMessage(conversationId: string, text: string) {
    await this.ensureConnected();
    return this.ensureHub().invoke('SendMessage', conversationId, text).catch((err: any) => { throw this.formatHubError(err); });
  }
  async createMessageRequest(creatorId: number, firstMessageText: string) {
    await this.ensureConnected();
    return this.ensureHub().invoke('CreateMessageRequest', String(creatorId), firstMessageText).catch((err: any) => { throw this.formatHubError(err); });
  }
  async respondToMessageRequest(conversationId: string, accept: boolean) {
    await this.ensureConnected();
    return this.ensureHub().invoke('RespondToMessageRequest', conversationId, accept).catch((err: any) => { throw this.formatHubError(err); });
  }
  async createServiceRequest(conversationId: string, requirements: string, proposedBudget?: number | null) {
    await this.ensureConnected();
    return this.ensureHub().invoke('CreateServiceRequest', conversationId, requirements, proposedBudget ?? null).catch((err: any) => { throw this.formatHubError(err); });
  }
  async acceptServiceRequest(conversationId: string, serviceRequestId: string, deadlineUtc: string) {
    await this.ensureConnected();
    return this.ensureHub().invoke('AcceptServiceRequest', conversationId, serviceRequestId, deadlineUtc).catch((err: any) => { throw this.formatHubError(err); });
  }
  async updateServiceRequestDeadline(conversationId: string, serviceRequestId: string, newDeadlineUtc: string) {
    await this.ensureConnected();
    return this.ensureHub().invoke('UpdateServiceRequestDeadline', conversationId, serviceRequestId, newDeadlineUtc).catch((err: any) => { throw this.formatHubError(err); });
  }
  async confirmServiceRequest(conversationId: string, serviceRequestId: string) {
    await this.ensureConnected();
    return this.ensureHub().invoke('ConfirmServiceRequest', conversationId, serviceRequestId).catch((err: any) => { throw this.formatHubError(err); });
  }
  async deliverProduct(conversationId: string, productId: number, price: number, serviceRequestId?: string | null) {
    await this.ensureConnected();
    return this.ensureHub().invoke('DeliverProduct', conversationId, serviceRequestId ?? null, String(productId), price).catch((err: any) => { throw this.formatHubError(err); });
  }
  async markDeliveryPurchased(conversationId: string, deliveryId: string) {
    await this.ensureConnected();
    return this.ensureHub().invoke('MarkDeliveryPurchased', conversationId, deliveryId).catch((err: any) => { throw this.formatHubError(err); });
  }

  private formatHubError(err: any): Error {
    const msg = err?.message || err?.error?.message || err?.toString?.() || 'Unexpected error';
    return new Error(msg);
  }
}
