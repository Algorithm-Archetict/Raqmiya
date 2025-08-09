export interface ReviewDTO {
  id: number;
  rating: number;
  comment?: string; 
  userName: string;
  userAvatar?: string;
  createdAt: string;
}
