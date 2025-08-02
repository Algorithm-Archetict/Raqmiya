export interface CartItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  currency: string;
  image: string;
  description: string;
  creator: string;
  quantity: number;
  addedAt: Date;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartUpdateRequest {
  productId: number;
  quantity: number;
}

export interface CartResponse {
  success: boolean;
  cart: Cart;
  message?: string;
} 