import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface ConversationDto {
  id: string;
  creatorId: number;
  customerId: number;
  status: string;
  createdAt: string;
  lastMessageAt?: string | null;
}

export interface MessageRequestDto {
  id: string;
  conversationId: string;
  status: string;
  firstMessageText: string;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: number;
  body: string;
  type: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}

export interface MinimalUserDto {
  id: number;
  username: string;
  profileImageUrl?: string | null;
}

export interface ProductCreateRequestDTO {
  name: string;
  description?: string;
  price: number;
  currency: string;
  coverImageUrl?: string | null;
  thumbnailImageUrl?: string | null;
  previewVideoUrl?: string | null;
  isPublic: boolean; // must be false for private products
  permalink: string;
  features?: string[];
  compatibility?: string | null;
  license?: string | null;
  updates?: string | null;
  categoryId: number;
  tagIds: number[];
}

export interface ProductDetailDTO { id: number; name: string; price: number; permalink: string; isPublic: boolean; }

export interface ServiceRequestDto {
  id: string;
  conversationId: string;
  status: 'Pending' | 'AcceptedByCreator' | 'ConfirmedByCustomer' | string;
  requirements: string;
  proposedBudget?: number | null;
  currency?: string | null;
  deadlineUtc?: string | null;
  createdAt: string;
}

export interface DeadlineProposalDto {
  id: string;
  serviceRequestId: string;
  proposedDeadlineUtc: string;
  status: string;
  createdAt: string;
  reason?: string | null;
}

export interface DeliveryDto {
  id: string;
  conversationId: string;
  serviceRequestId?: string | null;
  productId: number;
  productName?: string | null;
  price: number;
  currency?: string | null;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MessagingHttpService {
  private base = environment.apiUrl.replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  private headers(): { headers: HttpHeaders } {
    const token = localStorage.getItem('authToken') || '';
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  getConversations(take = 50, skip = 0): Observable<ConversationDto[]> {
    return this.http.get<ConversationDto[]>(`${this.base}/messaging/conversations?take=${take}&skip=${skip}`, this.headers());
  }

  getPendingRequests(take = 50, skip = 0): Observable<MessageRequestDto[]> {
    return this.http.get<MessageRequestDto[]>(`${this.base}/messaging/requests/pending?take=${take}&skip=${skip}`, this.headers());
  }

  getMessages(conversationId: string, take = 50, skip = 0): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${this.base}/messaging/${conversationId}/messages?take=${take}&skip=${skip}`, this.headers());
  }

  getOutgoingRequests(take = 50, skip = 0): Observable<MessageRequestDto[]> {
    return this.http.get<MessageRequestDto[]>(`${this.base}/messaging/requests/outgoing?take=${take}&skip=${skip}`, this.headers());
  }

  respondToRequest(conversationId: string, accept: boolean): Observable<{ id: string; status: string; creatorId: number; customerId: number; }> {
    return this.http.post<{ id: string; status: string; creatorId: number; customerId: number; }>(
      `${this.base}/messaging/requests/${conversationId}/respond`,
      { accept },
      this.headers()
    );
  }

  getUserById(id: number): Observable<MinimalUserDto> {
    return this.http.get<MinimalUserDto>(`${this.base}/users/${id}`, this.headers());
  }

  uploadAttachment(conversationId: string, file: File, caption?: string): Observable<{ id: string; conversationId: string; senderId: number; body: string; type: string; createdAt: string; attachmentUrl?: string | null; attachmentType?: string | null; }>{
    const form = new FormData();
    form.append('file', file);
    if (caption && caption.trim()) form.append('caption', caption.trim());
    const headers = new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` });
    return this.http.post<{ id: string; conversationId: string; senderId: number; body: string; type: string; createdAt: string; attachmentUrl?: string | null; attachmentType?: string | null; }>(
      `${this.base}/messaging/${conversationId}/attachments`,
      form,
      { headers }
    );
  }

  createPrivateProduct(payload: ProductCreateRequestDTO): Observable<ProductDetailDTO> {
    // Ensure private
    const body = { ...payload, isPublic: false };
    return this.http.post<ProductDetailDTO>(`${this.base}/products`, body, this.headers());
  }

  // ===== Freelancing: Service Requests =====
  createServiceRequest(conversationId: string, requirements: string, proposedBudget?: number | null, currency?: string | null): Observable<{ id: string; conversationId: string; requirements: string; proposedBudget: number | null; currency?: string | null; status: string; deadlineUtc?: string | null; }>{
    return this.http.post<{ id: string; conversationId: string; requirements: string; proposedBudget: number | null; currency?: string | null; status: string; deadlineUtc?: string | null; }>(
      `${this.base}/messaging/${conversationId}/service-requests`,
      { requirements, proposedBudget: proposedBudget ?? null, currency: currency ?? null },
      this.headers()
    );
  }

  acceptServiceRequest(conversationId: string, serviceRequestId: string, deadlineUtc: string): Observable<{ id: string; conversationId: string; status: string; deadlineUtc: string; }>{
    return this.http.post<{ id: string; conversationId: string; status: string; deadlineUtc: string; }>(
      `${this.base}/messaging/${conversationId}/service-requests/${serviceRequestId}/accept`,
      { deadlineUtc },
      this.headers()
    );
  }

  updateServiceRequestDeadline(conversationId: string, serviceRequestId: string, newDeadlineUtc: string, reason?: string | null): Observable<{ id: string; conversationId: string; status: string; deadlineUtc: string; }>{
    return this.http.post<{ id: string; conversationId: string; status: string; deadlineUtc: string; }>(
      `${this.base}/messaging/${conversationId}/service-requests/${serviceRequestId}/deadline`,
      { newDeadlineUtc, reason: reason ?? null },
      this.headers()
    );
  }

  proposeDeadline(conversationId: string, serviceRequestId: string, proposedDeadlineUtc: string, reason?: string | null): Observable<DeadlineProposalDto>{
    return this.http.post<DeadlineProposalDto>(
      `${this.base}/messaging/${conversationId}/service-requests/${serviceRequestId}/deadline/propose`,
      { proposedDeadlineUtc, reason: reason ?? null },
      this.headers()
    );
  }

  getPendingDeadlineProposal(conversationId: string, serviceRequestId: string): Observable<DeadlineProposalDto | null>{
    return this.http.get<DeadlineProposalDto | null>(
      `${this.base}/messaging/${conversationId}/service-requests/${serviceRequestId}/deadline/pending`,
      this.headers()
    );
  }

  respondToDeadlineProposal(conversationId: string, serviceRequestId: string, proposalId: string, accept: boolean): Observable<{ id: string; conversationId: string; status: string; deadlineUtc?: string | null; }>{
    return this.http.post<{ id: string; conversationId: string; status: string; deadlineUtc?: string | null; }>(
      `${this.base}/messaging/${conversationId}/service-requests/${serviceRequestId}/deadline/${proposalId}/respond`,
      { accept },
      this.headers()
    );
  }

  confirmServiceRequest(conversationId: string, serviceRequestId: string): Observable<{ id: string; conversationId: string; status: string; }>{
    return this.http.post<{ id: string; conversationId: string; status: string; }>(
      `${this.base}/messaging/${conversationId}/service-requests/${serviceRequestId}/confirm`,
      {},
      this.headers()
    );
  }

  // ===== Freelancing: Deliveries =====
  deliverProduct(conversationId: string, payload: { serviceRequestId?: string | null; productId: number; price: number; currency?: string | null; }): Observable<{ id: string; conversationId: string; serviceRequestId?: string | null; productId: number; price: number; currency?: string | null; status: string; createdAt: string; }>{
    const body = { serviceRequestId: payload.serviceRequestId ?? null, productId: payload.productId, price: payload.price, currency: payload.currency ?? null };
    return this.http.post<{ id: string; conversationId: string; serviceRequestId?: string | null; productId: number; price: number; currency?: string | null; status: string; createdAt: string; }>(
      `${this.base}/messaging/${conversationId}/deliveries`,
      body,
      this.headers()
    );
  }

  markDeliveryPurchased(conversationId: string, deliveryId: string): Observable<{ id: string; conversationId: string; status: string; }>{
    return this.http.post<{ id: string; conversationId: string; status: string; }>(
      `${this.base}/messaging/${conversationId}/deliveries/${deliveryId}/purchased`,
      {},
      this.headers()
    );
  }

  // Private one-shot create + deliver
  createAndDeliverPrivateProduct(conversationId: string, payload: {
    serviceRequestId: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    categoryId: number;
    coverImageUrl?: string | null;
    thumbnailImageUrl?: string | null;
    previewVideoUrl?: string | null;
    features?: string | null;
    compatibility?: string | null;
    license?: string | null;
    updates?: string | null;
  }): Observable<DeliveryDto> {
    return this.http.post<DeliveryDto>(`${this.base}/messaging/${conversationId}/deliveries/private`, payload, this.headers());
  }

  getDeliveriesForConversation(conversationId: string): Observable<DeliveryDto[]> {
    return this.http.get<DeliveryDto[]>(`${this.base}/messaging/${conversationId}/deliveries`, this.headers());
  }

  // ===== Freelancing: Listings =====
  getCreatorServiceRequests(statuses: string[] = ['AcceptedByCreator','ConfirmedByCustomer'], take = 50, skip = 0): Observable<ServiceRequestDto[]>{
    const qs = new URLSearchParams();
    (statuses || []).forEach(s => qs.append('statuses', s));
    qs.append('take', String(take));
    qs.append('skip', String(skip));
    return this.http.get<ServiceRequestDto[]>(`${this.base}/messaging/service-requests/creator?${qs.toString()}`, this.headers());
  }

  getCustomerServiceRequests(statuses: string[] = ['AcceptedByCreator','ConfirmedByCustomer'], take = 50, skip = 0): Observable<ServiceRequestDto[]>{
    const qs = new URLSearchParams();
    (statuses || []).forEach(s => qs.append('statuses', s));
    qs.append('take', String(take));
    qs.append('skip', String(skip));
    return this.http.get<ServiceRequestDto[]>(`${this.base}/messaging/service-requests/customer?${qs.toString()}`, this.headers());
  }
}
