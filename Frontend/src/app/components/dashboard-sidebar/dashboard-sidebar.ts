import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { UnreadService } from '../../core/services/unread.service';
import { ChatSignalRService } from '../../core/services/chat-signalr.service';
import { MessagingHttpService } from '../../core/services/messaging-http.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [CommonModule, RouterModule,RouterLink],
  templateUrl: './dashboard-sidebar.html',
  styleUrls: ['./dashboard-sidebar.css']
})
export class DashboardSidebar implements OnInit {
  currentRoute: string = '';
  isCreator: boolean = false;
  isCustomer: boolean = false;
  isLoggedIn: boolean = false;
  totalUnread$!: Observable<number>; // includes pending (may be used elsewhere)
  messagesUnread$!: Observable<number>; // excludes pending, used for sidebar badge
  private meId: number | null = null;
  private readonly seenStorageKey = 'rq_seen_by_conv_v1';

  constructor(
    private router: Router,
    private authService: AuthService,
    private unread: UnreadService,
    private chat: ChatSignalRService,
    private http: MessagingHttpService,
  ) {}

  ngOnInit() {
    // Initialize unread observables
    this.totalUnread$ = this.unread.totalUnread$;
    this.messagesUnread$ = this.unread.messagesTotal$;
    // cache current user id for isMine checks
    const user = this.authService.getCurrentUser();
    this.meId = user?.id ?? null;
    // Get current route on component init
    this.currentRoute = this.router.url;
    
    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });

    // Check authentication status
    this.checkAuthStatus();

    // Listen for authentication changes
    this.authService.isLoggedIn$.subscribe(() => {
      this.checkAuthStatus();
    });

    // Listen for user changes to update role-based visibility
    this.authService.currentUser$.subscribe(() => {
      this.checkAuthStatus();
    });

    // Subscribe to new messages globally to update unread counts
    this.chat.messages$.subscribe(m => {
      if (!m) return;
      // count only messages from others and only when not on the chat page
      // Use Router.url at event time to avoid race conditions around NavigationEnd updates
      const urlNow = (this.router.url || '').toLowerCase();
      const onChatPage = urlNow.includes('messages');
      if ((this.meId == null || m.senderId !== this.meId) && !onChatPage) {
        this.unread.incrementOnce(m.conversationId, m.id, 1);
      }
    });

    // Keep pending counts up to date
    this.refreshPendingCounts();
    this.chat.conversation$.subscribe(() => this.refreshPendingCounts());
    this.chat.conversationDeleted$.subscribe(() => this.refreshPendingCounts());

    // Persist MessageSeen events globally so seen ticks stay colored across routes
    this.chat.messageSeen$.subscribe(e => {
      if (!e) return;
      try {
        const raw = localStorage.getItem(this.seenStorageKey);
        const obj = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
        const arr = Array.isArray(obj[e.conversationId]) ? obj[e.conversationId] : [];
        if (!arr.includes(e.messageId)) arr.push(e.messageId);
        obj[e.conversationId] = arr;
        localStorage.setItem(this.seenStorageKey, JSON.stringify(obj));
      } catch {}
    });
  }

  checkAuthStatus() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isCreator = this.authService.isCreator();
    this.isCustomer = this.authService.isCustomer();
  }

  logout() {
    this.authService.logout();
  }

  isActive(route: string): boolean {
    if (route === '/creator') {
      // Check if we're on the creator profile page for the current user
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.id) {
        return this.currentRoute === `/creator/${currentUser.id}`;
      }
    }
    return this.currentRoute === route;
  }

  navigateToCreatorProfile() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.router.navigate(['/creator', currentUser.id]);
    }
  }

  private refreshPendingCounts() {
    // fetch both incoming and outgoing pending requests and set the global pending count
    Promise.all([
      this.http.getPendingRequests(50, 0).toPromise(),
      this.http.getOutgoingRequests(50, 0).toPromise()
    ]).then(([incoming, outgoing]) => {
      const total = (incoming?.length || 0) + (outgoing?.length || 0);
      this.unread.setPendingCount(total);
    }).catch(() => {});
  }
}
