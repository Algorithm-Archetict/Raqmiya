// src/app/models/cart.model.ts

/**
 * Interface for a cart item
 */
export interface CartItem {
  id: number;
  productId: number;
  product: {
    id: number;
    name: string;
    price: number;
    currency: string;
    coverImageUrl?: string;
    creatorUsername: string;
  };
  quantity: number;
  addedAt: Date;
  price: number; // Price at time of adding to cart
}

/**
 * Interface for the shopping cart
 */
export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for adding item to cart request
 */
export interface AddToCartRequest {
  productId: number;
  quantity: number;
}

/**
 * Interface for updating cart item request
 */
export interface UpdateCartItemRequest {
  cartItemId: number;
  quantity: number;
}

/**
 * Interface for cart validation result
 */
export interface CartValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Cart validation error types
 */
export enum CartValidationError {
  PRODUCT_NOT_FOUND = 'Product not found',
  PRODUCT_NOT_AVAILABLE = 'Product is not available for purchase',
  INSUFFICIENT_STOCK = 'Insufficient stock available',
  INVALID_QUANTITY = 'Invalid quantity specified',
  PRODUCT_ALREADY_IN_CART = 'Product is already in cart',
  MAX_QUANTITY_EXCEEDED = 'Maximum quantity exceeded',
  PRICE_CHANGED = 'Product price has changed since adding to cart'
}

/**
 * Cart validation warning types
 */
export enum CartValidationWarning {
  LOW_STOCK = 'Low stock available',
  PRICE_INCREASE = 'Product price has increased',
  PRODUCT_STATUS_CHANGED = 'Product status has changed'
} 