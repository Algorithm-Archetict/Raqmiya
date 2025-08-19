import { Component, OnDestroy, OnInit, ViewChild, ElementRef, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSignalRService, ChatMessage, ConversationUpdate } from '../../core/services/chat-signalr.service';
import { UserService } from '../../core/services/user.service';
import { MessagingHttpService, ConversationDto, MessageRequestDto, MinimalUserDto, ServiceRequestDto, DeliveryDto } from '../../core/services/messaging-http.service';
import { UnreadService } from '../../core/services/unread.service';
import { ServiceRequestFormComponent } from '../../components/messaging/service-request-form/service-request-form';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceRequestFormComponent],
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.css']
})
export class ChatPage implements OnInit, OnDestroy {
  connectionState = signal<'disconnected'|'connecting'|'connected'>('disconnected');
  currentConversationId = signal<string>('');
  messages = signal<ChatMessage[]>([]);
  currentUserId = signal<number | null>(null);
  typingFromOther = signal<boolean>(false);
  // tick to recompute countdowns
  nowTick = signal<number>(Date.now());
  private typingHideTimer?: any;
  // cache of seen message IDs per conversation
  private seenByConv = new Map<string, Set<string>>();
  private readonly seenStorageKey = 'rq_seen_by_conv_v1';
  private processedMessageIds = new Set<string>();
  // throttle map for recent reconciliation
  private lastReconcileAt = new Map<string, number>();
  // temporary buffer to co-display caption with image
  private captionBuffer = new Map<string, { msg: ChatMessage; timer: any }>();

  conversations = signal<ConversationDto[]>([]);
  // conversations actually displayed (pending or with >=1 message)
  private conversationsFiltered = signal<ConversationDto[]>([]);
  pendingRequests = signal<MessageRequestDto[]>([]);
  outgoingRequests = signal<MessageRequestDto[]>([]);
  serviceRequests = signal<ServiceRequestDto[]>([]);
  deliveries = signal<DeliveryDto[]>([]);

  // inputs
  newMessage = signal<string>('');
  joinConvId = signal<string>('');
  creatorUsernameForRequest = signal<string>('');
  firstMessageText = signal<string>('');

  // peer display
  private peerUserId = signal<number | null>(null);
  private peerName = signal<string>('');
  private peerImageUrl = signal<string | null>(null);
  private userCache = new Map<number, MinimalUserDto>();
  private lastMsgPreview = new Map<string, string>();
  onlineUserIds = signal<Set<number>>(new Set());

  // menus & pickers
  showEmoji = signal<boolean>(false);
  showAttachMenu = signal<boolean>(false);
  showServiceForm = signal<boolean>(false);

  // attachment state
  private attachedFile: File | null = null;
  pendingAttachment: { file: File; previewUrl: string; isImage: boolean } | null = null;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('messageList') messageListRef?: ElementRef<HTMLElement>;

  private subs: Array<() => void> = [];

  // message history paging
  private pageSize = 50;
  private skip = 0;
  hasMoreHistory = false;

  constructor(private chat: ChatSignalRService, private users: UserService, private http: MessagingHttpService, private unread: UnreadService, private router: Router, private zone: NgZone) {}

  ngOnInit(): void {
    // cache current user id from JWT for accurate sender detection
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || '';
    let parsedId: number | null = null;
    try {
      const payload = token.split('.')[1];
      if (payload) {
        const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        const claim = json['nameid'] ?? json['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? json['sub'] ?? json['id'];
        const n = Number(claim);
        parsedId = Number.isFinite(n) ? n : null;
      }
    } catch {}
    this.currentUserId.set(parsedId);

    // connection state
    const s1 = this.chat.connectionState$.subscribe(state => this.connectionState.set(state));

    // hydrate seen cache from localStorage
    try {
      const raw = localStorage.getItem(this.seenStorageKey);
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, string[]>;
        Object.entries(obj || {}).forEach(([cid, arr]) => {
          if (Array.isArray(arr)) this.seenByConv.set(cid, new Set<string>(arr));
        });
      }
    } catch {}

    // incoming messages
    const s2 = this.chat.messages$.subscribe(m => {
      // Ensure we are inside Angular zone so signals trigger view updates immediately
      this.zone.run(() => {
      if (!m) return;
      // Do not early-return on seen IDs; some servers emit updates for the same message ID (e.g., URL attached later)
      // We'll upsert by ID below instead of skipping.
      // Normalize incoming message: prefer explicit attachmentUrl/attachmentType when provided by backend
      const attachmentUrl = ((m as any)?.attachmentUrl as string | undefined)?.trim();
      const attachmentType = ((m as any)?.attachmentType as string | undefined)?.trim();
      // Some servers may still send 'url' (legacy)
      const urlField = (m as any)?.url as string | undefined;
      const hasBody = !!(m.body && m.body.trim());
      const normalized: ChatMessage & { url?: string; attachmentUrl?: string | null; attachmentType?: string | null } = {
        id: String((m as any).id),
        conversationId: String((m as any).conversationId).trim().toLowerCase(),
        senderId: Number((m as any).senderId),
        body: hasBody ? m.body : (urlField ? String(urlField) : ''),
        type: m.type || '',
        createdAt: m.createdAt,
        url: urlField || undefined,
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
      };
      try { console.debug('[ChatPage] Incoming ReceiveMessage raw', m); } catch {}
      // Infer image type
      const bodyLower = (normalized.body || '').toLowerCase();
      // 1) Explicit attachmentType indicates the type
      if ((normalized as any).attachmentType && ((normalized as any).attachmentType as string).toLowerCase().includes('image')) {
        normalized.type = 'image';
      } else if ((normalized as any).attachmentUrl && (!normalized.type || normalized.type.toLowerCase() === 'attachment' || normalized.type.toLowerCase() === 'file')) {
        // 2) If explicit attachmentUrl exists, treat as image by default
        normalized.type = 'image';
      } else if (urlField && (!normalized.type || normalized.type.toLowerCase() === 'attachment' || normalized.type.toLowerCase() === 'file' || !normalized.type.trim())) {
        normalized.type = 'image';
      } else if (!normalized.type || normalized.type.toLowerCase() === 'attachment' || normalized.type.toLowerCase() === 'file') {
        // 3) Otherwise infer by typical patterns
        if (bodyLower.includes('/uploads/') || /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/i.test(bodyLower)) {
          normalized.type = 'image';
        }
      }
      // If it's an image and the body is just the URL (no caption), clear the body for sender-side display
      if ((normalized.type || '').toLowerCase() === 'image') {
        const bodyTrim = (normalized.body || '').trim();
        if (!bodyTrim) {
          normalized.body = '';
        } else if (urlField && bodyTrim === String(urlField).trim()) {
          normalized.body = '';
        }
      }
      const inCurrent = normalized.conversationId === this.currentConversationId();
      try { console.debug('[ChatPage] normalized', normalized, { current: this.currentConversationId(), inCurrent }); } catch {}
      // Mark seen ASAP for non-mine messages (even if we buffer their render)
      if (inCurrent && !this.isMine(normalized)) {
        this.chat.markSeen(normalized.conversationId, normalized.id).catch(() => {});
      }

      if (inCurrent) {
        // Buffer potential caption texts briefly so they can render together with their image if it arrives shortly after
        const isImage = (normalized.type || '').toLowerCase() === 'image';
        const isFromOther = !this.isMine(normalized);
        if (!isImage) {
          // buffer this text-like message for 400ms
          const t = setTimeout(() => {
            // timeout -> insert if still buffered
            const ent = this.captionBuffer.get(normalized.id);
            if (!ent) return;
            this.captionBuffer.delete(normalized.id);
            this.messages.update(list => {
              // First, try to merge this caption into a recent image from same sender/conv
              const nTime = new Date(normalized.createdAt).getTime();
              for (let i = list.length - 1; i >= 0 && i >= list.length - 30; i--) {
                const x = list[i] as any;
                if (!x) continue;
                if (x.conversationId !== normalized.conversationId) continue;
                if (x.senderId !== normalized.senderId) continue;
                const xIsImg = ((x.type || '') + '').toLowerCase() === 'image';
                if (!xIsImg) continue;
                const t = new Date(x.createdAt).getTime();
                if (Math.abs(nTime - t) > 15000) continue;
                // Merge caption into image and return without inserting a separate text entry
                const updated: any = { ...x };
                if (normalized.body && normalized.body.trim()) updated.body = normalized.body;
                const mergedList = [...list];
                mergedList[i] = updated;
                mergedList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                return mergedList;
              }
              // Otherwise, upsert by ID as usual
              const idx = list.findIndex(x => x.id === normalized.id);
              if (idx >= 0) {
                const merged = [...list];
                merged[idx] = { ...merged[idx], ...normalized };
                merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                return merged;
              }
              const merged = [...list, normalized];
              merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              return merged;
            });
            setTimeout(() => this.scrollToBottom(), 0);
          }, 400);
          // store buffer entry
          this.captionBuffer.set(normalized.id, { msg: normalized, timer: t });
          // preview cache update
          const bodyCap = normalized.body || '';
          this.lastMsgPreview.set(normalized.conversationId, bodyCap.length > 60 ? bodyCap.slice(0,57) + '…' : bodyCap);
          // Kick reconciliation to grab any attachment events that might come on a separate stream
          this.reconcileRecent(normalized.conversationId);
          return; // defer rendering for now
        }

        // If an image arrives (from any sender), try flush any buffered caption from same sender/conv within 60s
        if (isImage) {
          const fortySec = 60 * 1000;
          const imgTime = new Date(normalized.createdAt).getTime();
          const toFlush: string[] = [];
          this.captionBuffer.forEach((v, k) => {
            if (v.msg.conversationId === normalized.conversationId && v.msg.senderId === normalized.senderId) {
              const t = new Date(v.msg.createdAt).getTime();
              if (Math.abs(imgTime - t) <= fortySec) toFlush.push(k);
            }
          });
          // If this image currently lacks an explicit url, trigger a burst reconcile to pick it up ASAP
          const hasExplicitUrl = !!(normalized as any).url;
          if (!hasExplicitUrl) {
            this.scheduleReconcileBurst(normalized.conversationId);
          }
          // cancel timers and insert buffered captions immediately
          for (const id of toFlush) {
            const entry = this.captionBuffer.get(id);
            if (!entry) continue;
            clearTimeout(entry.timer);
            this.captionBuffer.delete(id);
            // insert buffered caption prior/after image; sorting by createdAt will arrange correctly
            this.messages.update(list => {
              const byId = new Map<string, ChatMessage>();
              list.forEach(x => byId.set(x.id, x));
              byId.set(entry.msg.id, entry.msg);
              const merged = Array.from(byId.values());
              merged.push(normalized);
              merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              return merged;
            });
            setTimeout(() => this.scrollToBottom(), 0);
          }
          // Coalesce any existing nearby text-only duplicate into this image message
          this.messages.update(list => {
            const nTime = new Date(normalized.createdAt).getTime();
            let updated = [...list];
            for (let i = updated.length - 1; i >= 0 && i >= updated.length - 30; i--) {
              const x = updated[i] as any;
              if (!x) continue;
              if (x.conversationId !== normalized.conversationId) continue;
              if (x.senderId !== normalized.senderId) continue;
              const xIsImg = ((x.type || '') + '').toLowerCase() === 'image';
              if (xIsImg) continue; // only text-like
              const t = new Date(x.createdAt).getTime();
              if (Math.abs(nTime - t) > 15000) continue;
              const sameBody = (x.body && normalized.body && x.body === normalized.body);
              if (sameBody) {
                // merge text into image by updating body if needed, then remove text entry
                (normalized as any).body = (normalized.body && normalized.body.trim()) ? normalized.body : x.body;
                updated.splice(i, 1);
                break;
              }
            }
            return updated;
          });
          // If nothing flushed, proceed to normal insertion below
        }

        // merge and keep chronological order so image+caption pairing works in real-time
        this.messages.update(list => {
          const idx = list.findIndex(x => x.id === normalized.id);
          let merged: ChatMessage[];
          if (idx >= 0) {
            const existing = list[idx];
            // merge fields, prefer latest non-empty body/type
            const updated: any = {
              ...existing,
              body: (normalized.body && normalized.body.trim()) ? normalized.body : existing.body,
              type: (normalized.type && normalized.type.trim()) ? normalized.type : existing.type,
              createdAt: normalized.createdAt || existing.createdAt,
              // Always take latest URL if provided
              url: (normalized as any).url || (existing as any).url,
              attachmentUrl: (normalized as any).attachmentUrl ?? (existing as any).attachmentUrl ?? null,
              attachmentType: (normalized as any).attachmentType ?? (existing as any).attachmentType ?? null,
            };
            merged = [...list];
            merged[idx] = updated;
          } else {
            // De-duplication for image messages from any sender: if a very similar image message already exists,
            // merge into it instead of appending a new one to avoid duplicates (e.g., caption+image double events).
            const isImg = (normalized.type || '').toLowerCase() === 'image';
            let dupIdx = -1;
            if (isImg) {
              const nTime = new Date(normalized.createdAt).getTime();
              // search recent tail for a candidate within 15s window
              for (let i = list.length - 1; i >= 0 && i >= list.length - 30; i--) {
                const x = list[i] as any;
                if (!x) continue;
                if (x.conversationId !== normalized.conversationId) continue;
                if (x.senderId !== normalized.senderId) continue;
                const xIsImg = ((x.type || '') + '').toLowerCase() === 'image';
                if (!xIsImg) continue;
                const t = new Date(x.createdAt).getTime();
                if (Math.abs(nTime - t) > 15000) continue;
                const sameUrl = (x.attachmentUrl && (normalized as any).attachmentUrl && x.attachmentUrl === (normalized as any).attachmentUrl);
                const sameBody = (x.body && normalized.body && x.body === normalized.body);
                if (sameUrl || sameBody) { dupIdx = i; break; }
              }
            }
            if (dupIdx >= 0) {
              const existing = list[dupIdx] as any;
              const updated: any = {
                ...existing,
                body: (normalized.body && normalized.body.trim()) ? normalized.body : existing.body,
                type: (normalized.type && normalized.type.trim()) ? normalized.type : existing.type,
                createdAt: normalized.createdAt || existing.createdAt,
                url: (normalized as any).url || existing.url,
                attachmentUrl: (normalized as any).attachmentUrl ?? existing.attachmentUrl ?? null,
                attachmentType: (normalized as any).attachmentType ?? existing.attachmentType ?? null,
              };
              merged = [...list];
              merged[dupIdx] = updated;
            } else {
              merged = [...list, normalized];
            }
          }
          merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return merged;
        });
        // scroll to bottom when new message in current conversation
        setTimeout(() => this.scrollToBottom(), 0);
        // Fallback: for any message from other user, reconcile recent messages to pull any missed attachment/caption events
        if (!this.isMine(normalized)) {
          this.reconcileRecent(normalized.conversationId);
          // Also schedule a brief burst to catch late attachment URLs
          this.scheduleReconcileBurst(normalized.conversationId);
        }
      }
      // update preview cache for any conversation on any incoming message
      const body = normalized.body || '';
      this.lastMsgPreview.set(normalized.conversationId, body.length > 60 ? body.slice(0,57) + '…' : body);
      });
    });

    // conversation updates (e.g., created/accepted/declined) -> always refetch from backend
    const s3 = this.chat.conversation$.subscribe((c: ConversationUpdate | null) => {
      if (!c) return;
      this.refreshLists();
    });

    // conversation deleted -> clear if current and refetch
    const s3b = this.chat.conversationDeleted$.subscribe(e => {
      if (!e) return;
      const cur = this.currentConversationId();
      if (cur && e.id === cur) {
        this.currentConversationId.set('');
        this.messages.set([]);
      }
      this.refreshLists();
    });

    // typing events
    const s4 = this.chat.typing$.subscribe(e => {
      if (!e) return;
      if (e.conversationId === this.currentConversationId()) {
        // other user typing
        if (e.userId !== this.currentUserId()) {
          this.typingFromOther.set(true);
          if (this.typingHideTimer) clearTimeout(this.typingHideTimer);
          this.typingHideTimer = setTimeout(() => this.typingFromOther.set(false), 2000);
        }
      }
    });

    // seen events
    const s5 = this.chat.messageSeen$.subscribe(e => {
      if (!e) return;
      // store per-conversation to preserve state even if user is not currently in this conversation
      const set = this.seenByConv.get(e.conversationId) || new Set<string>();
      set.add(e.messageId);
      this.seenByConv.set(e.conversationId, set);
      // persist to localStorage
      try {
        const toSave: Record<string, string[]> = {};
        this.seenByConv.forEach((val, key) => { toSave[key] = Array.from(val); });
        localStorage.setItem(this.seenStorageKey, JSON.stringify(toSave));
      } catch {}
    });

    // presence streams
    const s6 = this.chat.presence$.subscribe(e => {
      if (!e) return;
      const set = new Set(this.onlineUserIds());
      if (e.online) set.add(e.userId); else set.delete(e.userId);
      this.onlineUserIds.set(set);
    });
    const s7 = this.chat.onlineUsers$.subscribe((list: number[] | null) => {
      if (!list) return;
      this.onlineUserIds.set(new Set(list));
    });

    // service request or delivery updates -> refetch lists to sync UI
    const s8 = this.chat.serviceRequest$.subscribe(u => { if (u) { this.refreshLists(); this.reloadConversationExtras(); } });
    const s9 = this.chat.delivery$.subscribe(u => { if (u) { this.refreshLists(); this.reloadConversationExtras(); } });

    // Rejoin current conversation group after reconnection so recipients keep receiving real-time messages
    const sConn = this.chat.connectionState$.subscribe(st => {
      if (st === 'connected') {
        const cur = this.currentConversationId();
        if (cur) {
          this.chat.joinConversationGroup(cur).catch(() => {});
        }
      }
    });

    this.subs.push(
      () => s1.unsubscribe(),
      () => s2.unsubscribe(),
      () => s3.unsubscribe(),
      () => s4.unsubscribe(),
      () => s5.unsubscribe(),
      () => s6.unsubscribe(),
      () => s7.unsubscribe(),
      () => s3b.unsubscribe(),
      () => s8.unsubscribe(),
      () => s9.unsubscribe(),
      () => sConn.unsubscribe(),
    );

    // live countdown tick
    const tick = setInterval(() => this.nowTick.set(Date.now()), 1000);
    this.subs.push(() => clearInterval(tick));

    // initial fetch of conversations and pending requests
    this.refreshLists();
    // get initial online users snapshot
    this.chat.getOnlineUsers().catch(() => {});
  }

  ngOnDestroy(): void {
    this.subs.forEach(fn => fn());
  }

  async joinConversation() {
    const id = this.joinConvId().trim();
    if (!id) return;
    await this.selectConversation(id);
  }

  async send() {
    const convId = this.currentConversationId();
    const text = this.newMessage().trim();
    if (!convId) return;
    // If there is a pending attachment, first upload it, then optionally send caption text
    if (this.pendingAttachment) {
      try {
        const f = this.pendingAttachment.file;
        // Send caption together with the image, avoid creating a separate text message
        const resp = await this.http.uploadAttachment(convId, f, text || undefined).toPromise();
        // Do not optimistically append; rely on SignalR broadcast to avoid duplicates
        // Scroll to bottom to anticipate incoming message
        setTimeout(() => this.scrollToBottom(), 0);
        // Do NOT send a separate text message; caption already included with the image
      } catch (e: any) {
        alert(e?.message || 'Failed to send attachment');
        return;
      } finally {
        this.clearPendingAttachment();
      }
      this.newMessage.set('');
      return;
    }
    // No attachment -> send text-only message
    if (!text) return;
    await this.chat.sendMessage(convId, text);
    this.newMessage.set('');
    const preview = text.length > 60 ? text.slice(0,57) + '…' : text;
    this.lastMsgPreview.set(convId, preview);
    // Ensure the just-sent message is visible
    setTimeout(() => this.scrollToBottom(), 0);
  }

  async createMessageRequest() {
    const usernameRaw = this.creatorUsernameForRequest().trim();
    const text = this.firstMessageText().trim();
    if (!usernameRaw || !text) return;
    // Resolve username to creator id using public search; prefer exact (case-insensitive)
    const list = await this.users.searchCreators(usernameRaw, 5, 0).toPromise();
    const exact = (list || []).find(u => (u.username || '').toLowerCase() === usernameRaw.toLowerCase());
    const candidate = exact || (list && list[0]);
    if (!candidate) {
      alert('Creator not found. Please check the username.');
      return;
    }
    const result = await this.chat.createMessageRequest(candidate.id, text);
    // result contains { conversation, request }
    const conversationId = result?.conversation?.id ?? '';
    if (conversationId) {
      await this.selectConversation(conversationId);
    }
    this.firstMessageText.set('');
    this.creatorUsernameForRequest.set('');
    await this.refreshLists();
  }

  isMine(m: ChatMessage): boolean {
    const me = this.currentUserId();
    return me != null && m.senderId === me;
  }

  isSeen(m: ChatMessage): boolean {
    const set = this.seenByConv.get(m.conversationId);
    return !!set && set.has(m.id);
  }

  onTyping() {
    const id = this.currentConversationId();
    if (!id) return;
    this.chat.typing(id).catch(() => {});
  }

  // UI helpers for template type-safety
  convPreview(c: ConversationDto): string {
    // Some backends may provide lastMessagePreview; otherwise use cached preview or derive for current conversation
    const anyC: any = c as any;
    if (typeof anyC?.lastMessagePreview === 'string' && anyC.lastMessagePreview.trim()) return anyC.lastMessagePreview;
    const cached = this.lastMsgPreview.get(c.id);
    if (cached && cached.trim()) return cached;
    // If this is the selected conversation, fallback to last message body
    if (c.id === this.currentConversationId()) {
      const last = this.messages().slice(-1)[0];
      if (last?.body) return last.body.length > 60 ? last.body.slice(0, 57) + '…' : last.body;
    }
    return 'No messages yet';
  }

  isOnline(c: ConversationDto): boolean {
    const me = this.currentUserId();
    const other = me === c.creatorId ? c.customerId : c.creatorId;
    return this.onlineUserIds().has(other);
  }

  // Peer helpers for header/avatar
  peerUsername(): string {
    return this.peerName();
  }
  peerAvatarUrl(): string | null {
    return this.peerImageUrl();
  }
  peerInitials(): string {
    const n = (this.peerName() || '').trim();
    if (!n) return 'U';
    const parts = n.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U';
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  isPeerOnline(): boolean {
    const id = this.peerUserId();
    return id != null && this.onlineUserIds().has(id);
  }

  private derivePeerFromConversation() {
    const me = this.currentUserId();
    const cid = this.currentConversationId();
    if (!cid) { this.peerUserId.set(null); this.peerName.set(''); this.peerImageUrl.set(null); return; }
    const conv = (this.conversations() || []).find(c => c.id === cid);
    if (!conv) { this.peerUserId.set(null); this.peerName.set(''); this.peerImageUrl.set(null); return; }
    const otherId = me === conv.creatorId ? conv.customerId : conv.creatorId;
    this.peerUserId.set(otherId);
    // fetch from cache or API
    const cached = this.userCache.get(otherId);
    if (cached) {
      this.peerName.set(cached.username || 'User');
      this.peerImageUrl.set(cached.profileImageUrl || null);
    } else {
      this.http.getUserById(otherId).subscribe({
        next: (u) => {
          this.userCache.set(otherId, u);
          if (this.peerUserId() === otherId) {
            this.peerName.set(u.username || 'User');
            this.peerImageUrl.set(u.profileImageUrl || null);
          }
        },
        error: () => {
          this.peerName.set(me === conv.creatorId ? 'Customer' : 'Creator');
          this.peerImageUrl.set(null);
        }
      });
    }
  }

  private isResolvableImageSrc(src: string): boolean {
    try {
      if (!src) return false;
      const s = src.trim().toLowerCase();
      if (s.startsWith('http://') || s.startsWith('https://')) return true;
      if (s.startsWith('//')) return true;
      if (s.startsWith('/')) return true;
      return false;
    } catch { return false; }
  }

  // Emoji/Attachment handlers
  openEmojiPicker() { this.showEmoji.set(!this.showEmoji()); this.showAttachMenu.set(false); }
  addEmoji(e: string) {
    const cur = this.newMessage();
    this.newMessage.set((cur ? cur : '') + e);
  }
  triggerFile() { this.fileInputRef?.nativeElement?.click(); }
  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const f = input.files && input.files[0];
    if (!f) return;
    const isImg = (f.type || '').toLowerCase().startsWith('image/');
    if (!isImg) {
      alert('Only image files are allowed.');
      if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = '';
      return;
    }
    const url = URL.createObjectURL(f);
    this.pendingAttachment = { file: f, previewUrl: url, isImage: isImg };
    // close menus and keep focus on caption input
    this.showAttachMenu.set(false);
  }

  removePendingAttachment() {
    this.clearPendingAttachment();
  }

  private clearPendingAttachment() {
    try { if (this.pendingAttachment?.previewUrl) URL.revokeObjectURL(this.pendingAttachment.previewUrl); } catch {}
    this.pendingAttachment = null;
    if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = '';
  }

  toggleAttachMenu() { this.showAttachMenu.set(!this.showAttachMenu()); this.showEmoji.set(false); }
  toggleServiceForm() { this.showServiceForm.set(!this.showServiceForm()); this.showAttachMenu.set(false); this.showEmoji.set(false); }
  isCreatorInCurrent(): boolean {
    const me = this.currentUserId();
    const conv = (this.conversations() || []).find(c => c.id === this.currentConversationId());
    if (!me || !conv) return false;
    return me === conv.creatorId;
  }

  async requestService() {
    const convId = this.currentConversationId();
    if (!convId) return;
    const { value: formValues } = await Swal.fire<{ requirements: string; budget?: number | null; }>({
      title: 'Request Service',
      html: `
        <div style="display:flex;flex-direction:column;gap:10px;text-align:left">
          <label>Requirements</label>
          <textarea id="sw_req" class="swal2-textarea" placeholder="Describe what you need"></textarea>
          <label>Proposed budget (optional)</label>
          <input id="sw_budget" class="swal2-input" type="number" min="0" step="0.01" placeholder="e.g., 50" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const requirements = (document.getElementById('sw_req') as HTMLTextAreaElement)?.value?.trim();
        const budgetRaw = (document.getElementById('sw_budget') as HTMLInputElement)?.value?.trim();
        if (!requirements) { Swal.showValidationMessage('Please enter requirements'); return false as any; }
        const budget = budgetRaw ? Number(budgetRaw) : null;
        if (budgetRaw && !Number.isFinite(budget as number)) { Swal.showValidationMessage('Budget must be a number'); return false as any; }
        return { requirements, budget };
      }
    });
    if (!formValues) return;
    try {
      await this.chat.createServiceRequest(convId, formValues.requirements, formValues.budget ?? null);
      const uname = (this.peerUsername() || '').trim();
      const who = uname ? `@${uname}` : 'the creator';
      await Swal.fire({ icon: 'success', title: 'Service request sent', text: `Your service request has been sent successfully to ${who}.` });
    } catch (e: any) {
      await Swal.fire('Error', e?.message || 'Failed to create service request', 'error');
    } finally {
      this.showAttachMenu.set(false);
    }
  }

  async onServiceSubmitted(_: any) {
    // close form and refresh sidebars
    this.showServiceForm.set(false);
    await this.refreshLists();
    const uname = (this.peerUsername() || '').trim();
    const who = uname ? `@${uname}` : 'the creator';
    await Swal.fire({ icon: 'success', title: 'Service request sent', text: `Your service request has been sent successfully to ${who}.` });
  }

  async sendProduct() {
    const convId = this.currentConversationId();
    if (!convId) return;
    // Attach to an accepted/confirmed service request if available
    const sr = this.currentServiceRequests().find(x => x.status === 'AcceptedByCreator' || x.status === 'ConfirmedByCustomer');
    if (!sr) { await Swal.fire('Info', 'No accepted/confirmed service request to attach delivery.', 'info'); return; }
    // Navigate to full page product form in private delivery mode
    await this.router.navigate(['/deliveries/new'], {
      queryParams: {
        privateDelivery: '1',
        conversationId: convId,
        serviceRequestId: sr.id,
      }
    });
    this.showAttachMenu.set(false);
  }


  async refreshLists() {
    try {
      const [convs, reqs, outReqs, srForCreator, srForCustomer] = await Promise.all([
        this.http.getConversations(50, 0).toPromise(),
        this.http.getPendingRequests(50, 0).toPromise(),
        this.http.getOutgoingRequests(50, 0).toPromise(),
        this.http.getCreatorServiceRequests(['Pending','AcceptedByCreator','ConfirmedByCustomer'], 100, 0).toPromise(),
        this.http.getCustomerServiceRequests(['Pending','AcceptedByCreator','ConfirmedByCustomer'], 100, 0).toPromise()
      ]);
      const list = convs || [];
      this.conversations.set(list);
      // Reconcile current selection strictly against backend list
      const cur = this.currentConversationId();
      if (cur && !list.find(c => c.id === cur)) {
        this.currentConversationId.set('');
        this.messages.set([]);
      }
      // Build filtered view: keep Pending always, and for non-pending verify there is at least 1 message via backend
      const pending = (list || []).filter(c => c.status === 'Pending');
      const nonPending = (list || []).filter(c => c.status !== 'Pending');
      const checks = await Promise.all(
        nonPending.map(async c => {
          try {
            const msgs = await this.http.getMessages(c.id, 1, 0).toPromise();
            const has = (msgs || []).length > 0;
            if (has) {
              const body = msgs![0].body || '';
              this.lastMsgPreview.set(c.id, body.length > 60 ? body.slice(0,57) + '…' : body);
            }
            return { c, has };
          } catch { return { c, has: false }; }
        })
      );
      const withMessages = checks.filter(x => x.has).map(x => x.c);
      const finalList = [...pending, ...withMessages];
      this.conversationsFiltered.set(finalList);
      // Reconcile current selection against filtered list actually shown
      const curShown = this.currentConversationId();
      if (curShown && !finalList.find(c => c.id === curShown)) {
        this.currentConversationId.set('');
        this.messages.set([]);
      }

      // hydrate user cache for peers
      const me = this.currentUserId();
      const ids = new Set<number>();
      (finalList || []).forEach(c => {
        const other = me === c.creatorId ? c.customerId : c.creatorId;
        ids.add(other);
      });
      ids.forEach(id => {
        if (id && !this.userCache.has(id)) {
          this.http.getUserById(id).subscribe({ next: u => this.userCache.set(id, u) });
        }
      });
      this.pendingRequests.set(reqs || []);
      this.outgoingRequests.set(outReqs || []);
      // Merge service requests from both perspectives and de-duplicate by id
      const merged = [...(srForCreator || []), ...(srForCustomer || [])];
      const byId = new Map<string, ServiceRequestDto>();
      for (const it of merged) byId.set(it.id, it);
      this.serviceRequests.set(Array.from(byId.values()));
      // Update global pending count (incoming + outgoing)
      this.unread.setPendingCount((reqs?.length || 0) + (outReqs?.length || 0));
      // Avoid pruning here to prevent dropping unread counts for conversations not included in first page
      // join all conversation groups so we don't miss MessageSeen events when not viewing a conversation
      try {
        await Promise.all((finalList || []).map(c => this.chat.joinConversationGroup(c.id).catch(() => {})));
      } catch {}
      // also reload extras if a conversation is selected
      await this.reloadConversationExtras();
    } catch {}
  }

  // Briefly burst reconcile a few times to aggressively pick up late-arriving attachment URLs
  private scheduleReconcileBurst(conversationId: string) {
    // fire at most 2 attempts to avoid UI lag
    try {
      setTimeout(() => this.reconcileRecent(conversationId, true), 0);
      setTimeout(() => this.reconcileRecent(conversationId, true), 250);
    } catch {}
  }

  async selectConversation(id: string) {
    const normId = (id || '').trim().toLowerCase();
    this.currentConversationId.set(normId);
    this.messages.set([]);
    this.skip = 0;
    await this.chat.joinConversationGroup(normId);
    this.derivePeerFromConversation();
    // load history
    try {
      const history = await this.http.getMessages(id, this.pageSize, 0).toPromise();
      this.hasMoreHistory = (history || []).length === this.pageSize;
      this.skip = 0;
      const mapped = (history || []).map(m => ({
        id: m.id,
        conversationId: String(m.conversationId).toLowerCase(),
        senderId: m.senderId,
        // Preserve original body as caption; attachmentUrl will drive image rendering
        body: m.body || '',
        type: m.type || '',
        createdAt: m.createdAt,
        // Carry both new and legacy fields for robust rendering
        attachmentUrl: (m as any).attachmentUrl ?? null,
        attachmentType: (m as any).attachmentType ?? null,
        url: (m as any).url || undefined,
      } as any));
      // ensure chronological order ascending for caption pairing
      mapped.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      this.messages.set(mapped);
      // compute and cache preview using the latest by createdAt
      const hist = history || [];
      if (hist.length > 0) {
        const latest = hist.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b));
        const p = (latest.body || '');
        this.lastMsgPreview.set(id, p.length > 60 ? p.slice(0,57) + '…' : p);
      }
      // reset unread for this conversation
      this.unread.reset(id);
      // ensure a seen set exists for this conversation
      if (!this.seenByConv.has(id)) this.seenByConv.set(id, new Set<string>());
      // mark ALL messages from the other user as seen so sender ticks color for all unseen messages
      const msgs = this.messages();
      for (let i = 0; i < msgs.length; i++) {
        const m = msgs[i];
        if (!this.isMine(m)) {
          this.chat.markSeen(id, m.id).catch(() => {});
        }
      }
      // scroll to bottom after loading history for selected conversation
      setTimeout(() => this.scrollToBottom(), 0);
    } catch {}
  }

  async loadOlder() {
    const id = this.currentConversationId();
    if (!id) return;
    this.skip += this.pageSize;
    try {
      const older = await this.http.getMessages(id, this.pageSize, this.skip).toPromise();
      this.hasMoreHistory = (older || []).length === this.pageSize;
      const mapped = (older || []).map(m => ({
        id: m.id,
        conversationId: String(m.conversationId).toLowerCase(),
        senderId: m.senderId,
        body: m.body,
        type: m.type,
        createdAt: m.createdAt,
        attachmentUrl: (m as any).attachmentUrl ?? null,
        attachmentType: (m as any).attachmentType ?? null,
        url: (m as any).url || undefined,
      }));
      const current = this.messages();
      const merged = [ ...(mapped || []), ...current ];
      merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      this.messages.set(merged);
    } catch {}
  }

  // Reconcile recent messages from backend to catch races where attachment URL arrives slightly later
  private async reconcileRecent(conversationId: string, force: boolean = false) {
    const now = Date.now();
    const last = this.lastReconcileAt.get(conversationId) || 0;
    if (!force && (now - last < 1000)) return; // throttle to 1s per conversation unless forced
    this.lastReconcileAt.set(conversationId, now);
    try {
      const recent = await this.http.getMessages(conversationId, 20, 0).toPromise();
      const mapped: Array<ChatMessage & { url?: string; attachmentUrl?: string | null; attachmentType?: string | null; }> = (recent || []).map(m => ({
        id: m.id,
        conversationId: String(m.conversationId).toLowerCase(),
        senderId: m.senderId,
        // Keep caption text; attachments come via explicit fields
        body: (m as any).body || '',
        type: (m as any).type || '',
        createdAt: m.createdAt,
        url: (m as any).url || undefined,
        attachmentUrl: (m as any).attachmentUrl ?? null,
        attachmentType: (m as any).attachmentType ?? null,
      }));
      // infer image type by url/body
      mapped.forEach(mm => {
        const u = (((mm as any).url || (mm as any).attachmentUrl) || '').toLowerCase();
        const s = (mm.body || '').toLowerCase();
        if (u) { mm.type = 'image'; return; }
        if (!mm.type || mm.type.toLowerCase() === 'attachment' || mm.type.toLowerCase() === 'file') {
          if (s.includes('/uploads/') || /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/i.test(s)) {
            mm.type = 'image';
          }
        }
      });
      this.messages.update(list => {
        const byId = new Map<string, ChatMessage>();
        list.forEach(x => byId.set(x.id, x));
        for (const it of mapped) {
          const ex = byId.get(it.id) as any;
          if (ex) {
            byId.set(it.id, {
              ...ex,
              body: (it.body && it.body.trim()) ? it.body : ex.body,
              type: (it.type && it.type.trim()) ? it.type : ex.type,
              createdAt: it.createdAt || ex.createdAt,
              url: (it as any).url || ex.url,
              attachmentUrl: (it as any).attachmentUrl ?? ex.attachmentUrl ?? null,
              attachmentType: (it as any).attachmentType ?? ex.attachmentType ?? null,
            });
          } else {
            byId.set(it.id, it);
          }
        }
        const merged = Array.from(byId.values());
        merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return merged;
      });
    } catch {}
  }

  private scrollToBottom() {
    const el = this.messageListRef?.nativeElement;
    if (!el) return;
    try {
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  async acceptRequest(req: MessageRequestDto) {
    try {
      await this.chat.respondToMessageRequest(req.conversationId, true);
      await this.refreshLists();
      await this.selectConversation(req.conversationId);
    } catch (e: any) {
      // fallback to HTTP
      try {
        await this.http.respondToRequest(req.conversationId, true).toPromise();
        await this.refreshLists();
        await this.selectConversation(req.conversationId);
      } catch (e2: any) {
        alert(e2?.message || 'Failed to accept request');
      }
    }
  }

  async declineRequest(req: MessageRequestDto) {
    try {
      await this.chat.respondToMessageRequest(req.conversationId, false);
      await this.refreshLists();
    } catch (e: any) {
      try {
        await this.http.respondToRequest(req.conversationId, false).toPromise();
        await this.refreshLists();
      } catch (e2: any) {
        alert(e2?.message || 'Failed to decline request');
      }
    }
  }

  private slugify(value: string): string {
    return (value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // display helpers
  convName(c: ConversationDto): string {
    const me = this.currentUserId();
    const other = me === c.creatorId ? c.customerId : c.creatorId;
    const u = this.userCache.get(other);
    return (u?.username || '').trim() || 'User';
  }

  avatarUrlForConv(c: ConversationDto): string | null {
    const me = this.currentUserId();
    const other = me === c.creatorId ? c.customerId : c.creatorId;
    const u = this.userCache.get(other);
    return (u?.profileImageUrl || null) as any;
  }

  initialsForConv(c: ConversationDto): string {
    const name = this.convName(c);
    const parts = (name || '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U';
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  unreadCount(c: ConversationDto): number { return this.unread.getFor(c.id); }

  formatStatus(s: string): string {
    if (!s) return '';
    return s.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  timeLeft(deadlineUtc?: string | null): string {
    if (!deadlineUtc) return '';
    // compute diff vs nowTick
    const now = this.nowTick();
    const end = Date.parse(deadlineUtc);
    const ms = end - now;
    if (isNaN(end)) return '';
    if (ms <= 0) return 'Expired';
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // trackBy functions to avoid DOM re-render overload
  trackByMessageId(_: number, m: ChatMessage) { return m.id; }
  trackByConvId(_: number, c: ConversationDto) { return c.id; }

  // helpers to get current conversation's service requests
  

  // Attachment helpers
  isImageMessage(m: ChatMessage): boolean {
    const t = (m?.type || '').toLowerCase();
    const at = (((m as any)?.attachmentType as string) || '').toLowerCase();
    const au = (((m as any)?.attachmentUrl as string) || '').trim();
    // Prefer explicit attachmentType
    if (at.includes('image')) {
      const resolved = this.imageUrl(m);
      return this.isResolvableImageSrc(resolved);
    }
    // Then prefer explicit attachmentUrl
    if (au) {
      const resolved = this.imageUrl(m);
      return this.isResolvableImageSrc(resolved);
    }
    // Fall back to message type
    if (t.includes('image')) {
      const resolved = this.imageUrl(m);
      return this.isResolvableImageSrc(resolved);
    }
    // Legacy 'url' field
    const u = ((m as any)?.url || '').trim();
    if (u) {
      const resolved = this.imageUrl(m);
      return this.isResolvableImageSrc(resolved);
    }
    // Finally, body heuristic
    const body = (m?.body || '').trim();
    if (!this.isLikelyImageUrl(body)) return false;
    const resolved = this.imageUrl(m);
    return this.isResolvableImageSrc(resolved);
  }

  // Caption pairing: if message at index is an image, and the next message is a text by same sender within 60s, treat it as caption
  getCaptionFor(index: number): string | null {
    try {
      const list = this.messages();
      const cur = list[index];
      const next = list[index + 1];
      if (!cur || !next) return null;
      if (!this.isImageMessage(cur)) return null;
      if (this.isImageMessage(next)) return null;
      // same sender
      if (cur.senderId !== next.senderId) return null;
      // within 60 seconds window
      const t1 = Date.parse(cur.createdAt);
      const t2 = Date.parse(next.createdAt);
      if (!isFinite(t1) || !isFinite(t2)) return (next.body || '').trim() || null;
      if (Math.abs(t2 - t1) > 60000) return null;
      return (next.body || '').trim() || null;
    } catch { return null; }
  }

  isCaptionOfPrevious(index: number): boolean {
    try {
      if (index <= 0) return false;
      const list = this.messages();
      const prev = list[index - 1];
      const cur = list[index];
      if (!prev || !cur) return false;
      if (!this.isImageMessage(prev)) return false;
      if (this.isImageMessage(cur)) return false;
      if (prev.senderId !== cur.senderId) return false;
      const t1 = Date.parse(prev.createdAt);
      const t2 = Date.parse(cur.createdAt);
      if (!isFinite(t1) || !isFinite(t2)) return true;
      return Math.abs(t2 - t1) <= 60000;
    } catch { return false; }
  }

  private isLikelyImageUrl(url: string): boolean {
    try {
      const s = String(url || '');
      if (!s) return false;
      // normalize slashes
      const norm = s.replace(/\\/g, '/');
      const lower = norm.toLowerCase();
      // treat any string containing '/uploads/' as image
      if (lower.includes('/uploads/')) return true;
      // absolute http(s) or relative path
      if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/')) {
        return /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/i.test(lower);
      }
      // bare uploads path without slash
      if (lower.startsWith('uploads/')) return true;
      return false;
    } catch { return false; }
  }

  imageUrl(m: ChatMessage): string {
    // Prefer explicit attachmentUrl, then legacy url, then body
    let s = ((((m as any)?.attachmentUrl as string) || '').trim());
    if (!s) s = ((((m as any)?.url as string) || '').trim());
    if (!s) s = (m?.body || '').trim();
    if (!s) return s;
    // normalize slashes
    s = s.replace(/\\/g, '/');
    const lower = s.toLowerCase();
    // 1) Already absolute http(s)
    if (lower.startsWith('http://') || lower.startsWith('https://')) return s;
    // 2) Protocol-relative //...
    if (s.startsWith('//')) {
      const proto = (typeof window !== 'undefined' && window.location && window.location.protocol) ? window.location.protocol : 'https:';
      return proto + s;
    }
    // 3) Build origin once
    let origin = '';
    try {
      const base = (typeof window !== 'undefined' && window.location) ? window.location.origin : 'https://localhost';
      origin = new URL(environment.apiUrl, base).origin;
    } catch {
      origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : 'https://localhost';
    }
    // 4) Only prefix origin for typical server paths
    if (lower.startsWith('/uploads/') || lower.startsWith('uploads/')) {
      if (lower.startsWith('uploads/')) s = '/' + s;
      return origin + s;
    }
    // 5) If it already starts with '/', assume server-relative
    if (s.startsWith('/')) return origin + s;
    // 6) Otherwise return as-is (likely a caption or non-image string)
    return s;
  }

  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement;
    if (!img) return;
    img.alt = 'Image failed to load';
    img.classList.add('img-error');
    try {
      const src = img.getAttribute('src') || img.src;
      // Find message by matching src (best-effort)
      const msg = this.messages().find(m => {
        try { return this.imageUrl(m) === src; } catch { return false; }
      });
      // eslint-disable-next-line no-console
      console.error('[Chat] Image load error', { src, messageId: msg?.id, type: msg?.type, rawUrl: (msg as any)?.url, attachmentUrl: (msg as any)?.attachmentUrl, attachmentType: (msg as any)?.attachmentType, body: msg?.body });
    } catch {}
  }

  onImgLoad(_: Event) {
    // Ensure newly loaded images don't push content without scrolling
    setTimeout(() => this.scrollToBottom(), 0);
  }

  private async reloadDeliveries() {
    try {
      const cid = this.currentConversationId();
      if (!cid) { this.deliveries.set([]); return; }
      const list = await this.http.getDeliveriesForConversation(cid).toPromise();
      this.deliveries.set(list || []);
    } catch { this.deliveries.set([]); }
  }

  private async reloadConversationExtras() {
    const cid = this.currentConversationId();
    if (!cid) { this.deliveries.set([]); return; }
    await this.reloadDeliveries();
  }

  async purchaseDelivery(d: DeliveryDto) {
    const cid = this.currentConversationId();
    if (!cid) return;
    try {
      await this.http.markDeliveryPurchased(cid, d.id).toPromise();
      await this.reloadDeliveries();
    } catch (e: any) {
      await Swal.fire('Error', e?.message || 'Failed to complete purchase', 'error');
    }
  }

  // returns the filtered list computed during refreshLists()
  displayConversations(): ConversationDto[] { return this.conversationsFiltered(); }

  // pending conversation helpers
  private getCurrentConversation(): ConversationDto | undefined {
    const id = this.currentConversationId();
    return (this.conversations() || []).find(c => c.id === id);
  }
  isCurrentPending(): boolean {
    const c = this.getCurrentConversation();
    return !!c && c.status === 'Pending';
  }
  // return the first message text associated with the current pending request, if any
  currentPendingRequestText(): string | null {
    const cid = this.currentConversationId();
    if (!cid) return null;
    // If I'm the creator in this conversation, the request will be in pendingRequests
    if (this.isCreatorInCurrent()) {
      const req = (this.pendingRequests() || []).find(r => r.conversationId === cid);
      return (req?.firstMessageText || '').trim() || null;
    }
    // If I'm the customer (who sent the request), it will be in outgoingRequests
    const out = (this.outgoingRequests() || []).find(r => r.conversationId === cid);
    return (out?.firstMessageText || '').trim() || null;
  }
  async acceptCurrentPending() {
    const id = this.currentConversationId();
    if (!id) return;
    try {
      await this.chat.respondToMessageRequest(id, true);
      // Always refetch from backend for source of truth
      await this.refreshLists();
      // Ensure we fetch messages again so the initial message shows immediately
      await this.selectConversation(id);
    } catch {}
  }
  async declineCurrentPending() {
    const id = this.currentConversationId();
    if (!id) return;
    try {
      await this.chat.respondToMessageRequest(id, false);
      // Refetch from backend, selection will be reconciled there
      await this.refreshLists();
    } catch {}
  }

  // ===== Service Requests (UI helpers + actions) =====
  currentServiceRequests(): ServiceRequestDto[] {
    const cid = this.currentConversationId();
    if (!cid) return [];
    return (this.serviceRequests() || []).filter(sr => sr.conversationId === cid);
  }

  hasConfirmedServiceRequest(): boolean {
    const list = this.currentServiceRequests();
    return list.some(sr => sr.status === 'ConfirmedByCustomer');
  }

  // Count "active/ongoing" services between the two parties for the current conversation.
  // We treat AcceptedByCreator and ConfirmedByCustomer as active/ongoing engagements.
  activeOngoingCount(): number {
    const list = this.currentServiceRequests();
    return list.filter(sr => sr.status === 'AcceptedByCreator' || sr.status === 'ConfirmedByCustomer').length;
  }

  async acceptServiceRequest(sr: ServiceRequestDto) {
    const convId = sr.conversationId;
    const { value: deadline } = await Swal.fire<{ date: string; time: string }>({
      title: 'Accept Service Request',
      html: `
        <div style="display:flex;gap:10px;align-items:end">
          <div style="display:flex;flex-direction:column;gap:6px">
            <label>Date</label>
            <input id="sr_date" class="swal2-input" type="date" />
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <label>Time</label>
            <input id="sr_time" class="swal2-input" type="time" />
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const d = (document.getElementById('sr_date') as HTMLInputElement)?.value?.trim();
        const t = (document.getElementById('sr_time') as HTMLInputElement)?.value?.trim() || '23:59';
        if (!d) { Swal.showValidationMessage('Please choose a date'); return false as any; }
        return { date: d, time: t };
      }
    });
    if (!deadline) return;
    try {
      const iso = new Date(`${deadline.date}T${deadline.time}:00Z`).toISOString();
      await this.chat.acceptServiceRequest(convId, sr.id, iso);
      await this.refreshLists();
    } catch (e: any) {
      try {
        const iso = new Date(`${deadline.date}T${deadline.time}:00Z`).toISOString();
        await this.http.acceptServiceRequest(convId, sr.id, iso).toPromise();
        await this.refreshLists();
      } catch (e2: any) { await Swal.fire('Error', e2?.message || 'Failed to accept request', 'error'); }
    }
  }

  async confirmServiceRequest(sr: ServiceRequestDto) {
    const convId = sr.conversationId;
    try {
      await this.chat.confirmServiceRequest(convId, sr.id);
      await this.refreshLists();
    } catch (e: any) {
      try {
        await this.http.confirmServiceRequest(convId, sr.id).toPromise();
        await this.refreshLists();
      } catch (e2: any) { await Swal.fire('Error', e2?.message || 'Failed to confirm request', 'error'); }
    }
  }
}
