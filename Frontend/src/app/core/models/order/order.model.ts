export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  currency: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  customerInfo: CustomerInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInfo {
  email: string;
  phone?: string;
  country?: string;
  zipCode?: string;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  paymentMethod: string;
  customerInfo: CustomerInfo;
}

export interface OrderResponse {
  success: boolean;
  order: Order;
  message?: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
} 