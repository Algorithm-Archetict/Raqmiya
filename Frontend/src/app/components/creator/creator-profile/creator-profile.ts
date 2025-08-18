import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ProductService } from '../../../core/services/product.service';
import { AuthService } from '../../../core/services/auth.service';
import { CreatorProfile } from '../../../core/models/subscription/subscription.model';
import { ProductListItemDTO } from '../../../core/models/product/product-list-item.dto';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { Navbar } from '../../navbar/navbar';
import Swal from 'sweetalert2';
import { ChatSignalRService } from '../../../core/services/chat-signalr.service';

@Component({
  selector: 'app-creator-profile',
  standalone: true,
  imports: [CommonModule, LoadingSpinner, Navbar],
  templateUrl: './creator-profile.html',
  styleUrl: './creator-profile.css'
})
export class CreatorProfileComponent implements OnInit {
  creatorProfile: CreatorProfile | null = null;
  creatorProducts: ProductListItemDTO[] = [];
  loading = true;
  productsLoading = false;
  error = false;
  isSubscribing = false;
  currentUserId: number | null = null;
  publicProductCount: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private productService: ProductService,
    private authService: AuthService,
    private chat: ChatSignalRService
  ) {}

  ngOnInit() {
    this.currentUserId = this.authService.getCurrentUser()?.id || null;
    this.loadCreatorProfile();
  }

  loadCreatorProfile() {
    const creatorId = this.route.snapshot.paramMap.get('id');
    if (!creatorId) {
      this.error = true;
      this.loading = false;
      return;
    }

    this.subscriptionService.getCreatorProfile(+creatorId).subscribe({
      next: (profile) => {
        this.creatorProfile = profile;
        this.loading = false;
        this.loadCreatorProducts(+creatorId);
        // Fetch public product count (excludes private/freelance)
        this.productService.getPublicProductCountForCreator(+creatorId).subscribe({
          next: (count) => { this.publicProductCount = count; },
          error: (e) => { console.warn('Failed to load public product count', e); this.publicProductCount = null; }
        });
      },
      error: (error) => {
        console.error('Error loading creator profile:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadCreatorProducts(creatorId: number) {
    this.productsLoading = true;
    this.productService.getProductsByCreator(creatorId).subscribe({
      next: (products) => {
        this.creatorProducts = products;
        this.productsLoading = false;
      },
      error: (error) => {
        console.error('Error loading creator products:', error);
        this.productsLoading = false;
      }
    });
  }

  toggleSubscription() {
    if (!this.creatorProfile || !this.currentUserId) {
      this.showLoginPrompt();
      return;
    }

    // Prevent subscription actions for deleted creators
    if (this.creatorProfile.isDeleted) {
      Swal.fire({
        icon: 'warning',
        title: 'Account Deleted',
        text: 'This creator\'s account has been deleted. Subscription actions are not available.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Prevent self-subscription
    if (this.isViewingOwnProfile()) {
      Swal.fire({
        icon: 'info',
        title: 'Your Profile',
        text: 'You cannot subscribe to your own profile.',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (this.isSubscribing) return;

    this.isSubscribing = true;

    if (this.creatorProfile.isSubscribed) {
      this.unsubscribe();
    } else {
      this.subscribe();
    }
  }

  subscribe() {
    if (!this.creatorProfile) return;

    this.subscriptionService.subscribe(this.creatorProfile.id).subscribe({
      next: (response) => {
        this.isSubscribing = false;
        
        // Handle both success and "already subscribed" cases
        if (response.success || response.isSubscribed) {
          this.creatorProfile!.isSubscribed = true;
          
          // Only increment follower count if it's a new subscription
          if (response.success) {
            this.creatorProfile!.followerCount++;
          }
          
          Swal.fire({
            icon: 'success',
            title: response.success ? 'Subscribed!' : 'Already Subscribed',
            text: response.message,
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Subscription Failed',
            text: response.message
          });
        }
      },
      error: (error) => {
        this.isSubscribing = false;
        console.error('Error subscribing:', error);
        Swal.fire({
          icon: 'error',
          title: 'Subscription Failed',
          text: 'An error occurred while subscribing. Please try again.'
        });
      }
    });
  }

  unsubscribe() {
    if (!this.creatorProfile) return;

    this.subscriptionService.unsubscribe(this.creatorProfile.id).subscribe({
      next: (response) => {
        this.isSubscribing = false;
        
        // Handle both success and "not subscribed" cases
        if (response.success || !response.isSubscribed) {
          this.creatorProfile!.isSubscribed = false;
          
          // Only decrement follower count if it was an active subscription
          if (response.success) {
            this.creatorProfile!.followerCount--;
          }
          
          Swal.fire({
            icon: 'success',
            title: response.success ? 'Unsubscribed' : 'Not Subscribed',
            text: response.message,
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Unsubscribe Failed',
            text: response.message
          });
        }
      },
      error: (error) => {
        this.isSubscribing = false;
        console.error('Error unsubscribing:', error);
        Swal.fire({
          icon: 'error',
          title: 'Unsubscribe Failed',
          text: 'An error occurred while unsubscribing. Please try again.'
        });
      }
    });
  }

  showLoginPrompt() {
    Swal.fire({
      icon: 'info',
      title: 'Login Required',
      text: 'Please log in to subscribe to creators.',
      showCancelButton: true,
      confirmButtonText: 'Login',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  viewProduct(productId: number) {
    this.router.navigate(['/discover', productId]);
  }

  goToDiscover() {
    this.router.navigate(['/discover']);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getSubscriptionButtonText(): string {
    if (this.isSubscribing) {
      return 'Processing...';
    }
    return this.creatorProfile?.isSubscribed ? 'Unsubscribe' : 'Subscribe';
  }

  getSubscriptionButtonClass(): string {
    if (this.isSubscribing) {
      return 'btn-secondary';
    }
    return this.creatorProfile?.isSubscribed ? 'btn-outline-danger' : 'btn-primary';
  }

  isViewingOwnProfile(): boolean {
    return this.currentUserId !== null && this.creatorProfile !== null && this.currentUserId === this.creatorProfile.id;
  }

  startChat() {
    if (!this.currentUserId) {
      this.showLoginPrompt();
      return;
    }

    if (!this.creatorProfile) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Creator information not available.'
      });
      return;
    }

    // Prevent chat for deleted creators
    if (this.creatorProfile.isDeleted) {
      Swal.fire({
        icon: 'warning',
        title: 'Account Deleted',
        text: 'This creator\'s account has been deleted. Chat is not available.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Prompt for the first message text
    Swal.fire<{ value: string } | undefined>({
      title: `Message ${this.creatorProfile.username}`,
      input: 'text',
      inputPlaceholder: 'Type your first message... (required)',
      showCancelButton: true,
      confirmButtonText: 'Start Chat',
      preConfirm: (value) => {
        if (!value || !value.trim()) {
          Swal.showValidationMessage('Please enter a message');
          return undefined as any;
        }
        return { value: value.trim() } as any;
      }
    }).then(async (res) => {
      if (!res.isConfirmed || !res.value?.value) return;
      try {
        const firstMessage = res.value.value.trim();
        const result: any = await this.chat.createMessageRequest(this.creatorProfile!.id, firstMessage);
        const conversationId: string = result?.conversation?.id || '';
        if (conversationId) {
          // Join the conversation group and navigate to messages page
          await this.chat.joinConversationGroup(conversationId);
        }
        this.router.navigate(['/messages']);
      } catch (err: any) {
        console.error('Failed to create message request', err);
        const msg: string = (err?.error?.message || err?.message || '').toString();
        if (/pending or active conversation already exists/i.test(msg)) {
          await Swal.fire({ icon: 'info', title: 'Conversation exists', text: 'You already have a conversation with this creator.' });
          this.router.navigate(['/messages']);
          return;
        }
        if (/cannot message yourself/i.test(msg)) {
          await Swal.fire({ icon: 'warning', title: 'Action not allowed', text: 'You cannot message yourself.' });
          return;
        }
        await Swal.fire({
          icon: 'error',
          title: 'Unable to start chat',
          text: msg || 'Please try again later.'
        });
      }
    });
  }

  getCreatorInitials(): string {
    if (!this.creatorProfile?.username) {
      return '?';
    }
    
    const words = this.creatorProfile.username.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }
}
