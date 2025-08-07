export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  profileDescription?: string;
  profileImageUrl?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface UserProfileUpdateRequest {
  username?: string;
  profileDescription?: string;
  profileImageUrl?: string;
}

export interface UserProfileUpdateResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface UploadProfileImageRequest {
  image: File;
}

export interface UploadProfileImageResponse {
  success: boolean;
  message: string;
  imageUrl?: string;
}
