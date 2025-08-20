import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile, UserProfileUpdateRequest } from '../../../core/models/user/user-profile.model';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit, OnDestroy {
  profileData: UserProfileUpdateRequest = {
    username: '',
    profileDescription: ''
  };

  currentUser: UserProfile | null = null;
  isUploading = false;
  isSaving = false;
  isRemoving = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    public userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Check if user is logged in
    if (this.authService.isLoggedIn()) {
      this.loadProfileData();
    } else {
      console.error('User not logged in');
      this.errorMessage = 'Please log in to view your profile.';
      setTimeout(() => {
        this.authService.logout();
      }, 2000);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfileData() {
    // Force refresh user data from server to ensure we have the correct user's data
    this.userService.forceRefreshUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (user) {
            this.currentUser = user;
            this.profileData = {
              username: user.username,
              profileDescription: user.profileDescription || '',
              profileImageUrl: user.profileImageUrl
            };
          } else {
            // If no user data is returned, redirect to login
            this.authService.logout();
          }
        },
        error: (error) => {
          console.error('Error loading profile data:', error);
          this.errorMessage = 'Failed to load profile data. Please try again.';
          // If there's an authentication error, redirect to login
          if (error.status === 401) {
            this.authService.logout();
          }
        }
      });
  }

  uploadPicture() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/gif';
    
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.handleImageUpload(file);
      }
    };
    
    fileInput.click();
  }

  private handleImageUpload(file: File) {
    // Validate file
    const validation = this.userService.validateImageFile(file);
    if (!validation.isValid) {
      this.errorMessage = validation.error || 'Invalid file';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';

    // Create preview
    this.userService.createImagePreview(file)
      .then(previewUrl => {
        // Update the profile data immediately for preview
        this.profileData.profileImageUrl = previewUrl;
      })
      .catch(error => {
        console.error('Error creating preview:', error);
        this.errorMessage = 'Error creating image preview';
        this.isUploading = false;
      });

    // Upload to server with delay for better UX
    setTimeout(() => {
      this.userService.uploadProfileImage(file)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Upload response:', response);
            // Add delay before completing upload
            setTimeout(() => {
              this.isUploading = false;
              if (response.success && response.imageUrl) {
                this.profileData.profileImageUrl = response.imageUrl;
                this.successMessage = 'Profile picture updated successfully!';
                this.clearMessagesAfterDelay();
                // Refresh AuthService to update navbar
                this.authService.fetchUserProfile().subscribe();
              } else {
                // Check for content moderation error
                const errorMessage = response.message || 'Failed to upload image';
                if (this.userService.isContentModerationError(errorMessage)) {
                  this.errorMessage = this.userService.getContentModerationMessage();
                } else {
                  this.errorMessage = errorMessage;
                }
              }
            }, 500);
          },
          error: (error) => {
            console.error('Error uploading image:', error);
            setTimeout(() => {
              this.isUploading = false;
              this.errorMessage = 'Failed to upload image. Please try again.';
            }, 500);
          }
        });
    }, 1000); // Initial delay to show upload progress
  }

  removePicture() {
    if (this.isRemoving || this.isSaving) {
      return; // Prevent multiple clicks
    }

    this.isRemoving = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Add a small delay for better UX (simulate processing time)
    setTimeout(() => {
      // Set to null to remove the image and show initials instead
      this.profileData.profileImageUrl = null;

      // Save the changes to the backend with explicit empty string to remove image
      const updateData: UserProfileUpdateRequest = {
        username: this.profileData.username?.trim() || '',
        profileDescription: this.profileData.profileDescription?.trim() || undefined,
        profileImageUrl: '' // Set to empty string to remove the image
      };

      console.log('Sending remove request with data:', updateData);

      this.userService.updateProfile(updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Remove response:', response);
            console.log('Response user object:', response.user);
            console.log('Response user profileImageUrl:', response.user?.profileImageUrl);
            console.log('Current profileData.profileImageUrl:', this.profileData.profileImageUrl);
            console.log('Current currentUser:', this.currentUser);
            
            // Add another small delay before completing
            setTimeout(() => {
              this.isRemoving = false;
              if (response.success && response.user) {
                // Force update the current user and profile data
                this.currentUser = response.user;
                this.profileData.profileImageUrl = response.user.profileImageUrl;
                
                console.log('After update - currentUser:', this.currentUser);
                console.log('After update - profileData.profileImageUrl:', this.profileData.profileImageUrl);
                
                this.successMessage = 'Profile picture removed successfully!';
                this.clearMessagesAfterDelay();
                // Refresh AuthService to update navbar
                this.authService.fetchUserProfile().subscribe();
              } else {
                this.errorMessage = response.message || 'Failed to remove profile picture';
              }
            }, 300);
          },
          error: (error) => {
            console.error('Error removing profile picture:', error);
            setTimeout(() => {
              this.isRemoving = false;
              this.errorMessage = 'Failed to remove profile picture. Please try again.';
              // Restore the previous image URL on error
              this.profileData.profileImageUrl = this.currentUser?.profileImageUrl || null;
            }, 300);
          }
        });
    }, 800); // Initial delay to show loading state
  }

  saveProfile() {
    if (!this.profileData.username?.trim()) {
      this.errorMessage = 'Username is required';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData: UserProfileUpdateRequest = {
      username: this.profileData.username.trim(),
      profileDescription: this.profileData.profileDescription?.trim() || undefined,
      profileImageUrl: this.profileData.profileImageUrl || undefined
    };

    this.userService.updateProfile(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSaving = false;
          if (response.success && response.user) {
            this.currentUser = response.user;
            this.successMessage = 'Profile updated successfully!';
            this.clearMessagesAfterDelay();
            // Refresh AuthService to update navbar
            this.authService.fetchUserProfile().subscribe();
          } else {
            this.errorMessage = response.message || 'Failed to update profile';
          }
        },
        error: (error) => {
          this.isSaving = false;
          console.error('Error updating profile:', error);
          this.errorMessage = 'Failed to update profile. Please try again.';
        }
      });
  }

  // Helper methods for avatar display
  hasProfileImage(): boolean {
    return this.userService.hasProfileImage(this.currentUser);
  }

  getUserInitials(): string {
    return this.userService.getUserInitials(this.currentUser);
  }

  getProfileImageUrl(): string | null {
    return this.profileData.profileImageUrl || this.currentUser?.profileImageUrl || null;
  }

  showRemoveButton(): boolean {
    return !!(this.profileData.profileImageUrl || this.currentUser?.profileImageUrl);
  }

  getUserRole(): string {
    // Get role from current user data
    if (this.currentUser?.role) {
      return this.currentUser.role;
    }
    
    // Fallback to auth service
    return this.authService.getUserRole() || 'Unknown';
  }

  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }
} 