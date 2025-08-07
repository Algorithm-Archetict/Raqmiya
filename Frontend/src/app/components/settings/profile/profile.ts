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
  profilePicture: string | null = null;
  isUploading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    public userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProfileData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfileData() {
    this.userService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.profileData = {
            username: user.username,
            profileDescription: user.profileDescription || '',
            profileImageUrl: user.profileImageUrl
          };
          this.profilePicture = user.profileImageUrl || this.userService.getDefaultAvatarUrl();
        },
        error: (error) => {
          console.error('Error loading profile data:', error);
          this.errorMessage = 'Failed to load profile data. Please try again.';
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
        this.profilePicture = previewUrl;
      })
      .catch(error => {
        console.error('Error creating preview:', error);
        this.errorMessage = 'Error creating image preview';
        this.isUploading = false;
      });

    // Upload to server
    this.userService.uploadProfileImage(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isUploading = false;
          if (response.success && response.imageUrl) {
            this.profileData.profileImageUrl = response.imageUrl;
            this.profilePicture = response.imageUrl;
            this.successMessage = 'Profile picture updated successfully!';
            this.clearMessagesAfterDelay();
            // Refresh AuthService to update navbar
            this.authService.fetchUserProfile().subscribe();
          } else {
            this.errorMessage = response.message || 'Failed to upload image';
          }
        },
        error: (error) => {
          this.isUploading = false;
          console.error('Error uploading image:', error);
          this.errorMessage = 'Failed to upload image. Please try again.';
        }
      });
  }

  removePicture() {
    this.profilePicture = this.userService.getDefaultAvatarUrl();
    this.profileData.profileImageUrl = '';
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
      profileDescription: this.profileData.profileDescription?.trim() || '',
      profileImageUrl: this.profileData.profileImageUrl
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

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('LonelyMan.jpg')) {
      img.src = '../../../assets/images/LonelyMan.jpg';
    }
  }
  

  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 5000);
  }
} 