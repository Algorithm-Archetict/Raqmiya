export interface SubscribeRequest {
  creatorId: number;
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  isSubscribed: boolean;
}

export interface UnsubscribeRequest {
  creatorId: number;
}

export interface UnsubscribeResponse {
  success: boolean;
  message: string;
  isSubscribed: boolean;
}

export interface CreatorProfile {
  id: number;
  username: string;
  profileDescription?: string;
  profileImageUrl?: string;
  isSubscribed: boolean;
  followerCount: number;
  productCount: number;
  createdAt: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscribedAt?: string;
}

export interface Follower {
  id: number;
  username: string;
  profileImageUrl?: string;
  subscribedAt: string;
}

export interface CreatorFollowersResponse {
  success: boolean;
  message: string;
  followers: Follower[];
  totalCount: number;
}
