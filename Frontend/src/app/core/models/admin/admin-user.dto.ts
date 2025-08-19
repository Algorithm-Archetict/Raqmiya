export interface AdminUserDTO {
  id: number;
  username: string;
  email: string;
  role: string;
  profileDescription?: string;
  profileImageUrl?: string;
  createdAt: Date;
  isActive: boolean;
}