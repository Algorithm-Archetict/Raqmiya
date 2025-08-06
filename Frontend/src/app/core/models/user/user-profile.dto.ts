export interface UserProfileDTO {
    id: number;
    username: string | null;
    email: string | null;
    role: string | null;
    profileDescription: string | null;
    profileImageUrl: string | null;
    createdAt: string;
    isActive: boolean;
  }