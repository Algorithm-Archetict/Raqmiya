export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  currency: string;
  quantity: number;
}

export interface Order {
  id: number; // changed from string to number for backend alignment
  userId: number; // changed from string to number for backend alignment
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string; // changed to string for backend alignment
  customerInfo: CustomerInfo;
  createdAt: string; // changed to string (ISO date) for backend alignment
  updatedAt: string; // changed to string (ISO date) for backend alignment
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
