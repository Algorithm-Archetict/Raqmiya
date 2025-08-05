export interface ReviewDTO {
  id: number;
  rating: number;
  comment?: string;
  UserName: string; // Changed to match backend case
  userAvatar?: string;
  createdAt: string;
}
