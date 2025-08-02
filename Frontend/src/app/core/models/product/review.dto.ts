export interface ReviewDTO {
  id: number;
  rating: number;
  comment?: string;
  userName?: string;
  createdAt: string;
}