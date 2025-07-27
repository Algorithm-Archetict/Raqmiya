// src/app/models/user.model.ts

/**
 * More detailed user profile information.
 */
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    profilePictureUrl?: string;
    joinedDate: Date;
    // Add other profile-specific fields as needed, e.g., address, phone, socialLinks
  }
  
  /**
   * Interface for updating user profile.
   */
  export interface UserProfileUpdateRequest {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    profilePictureUrl?: string;
  }