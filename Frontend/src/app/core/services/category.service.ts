import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category } from '../data/categories';

export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
  parentCategoryId?: number | null;
  subcategories?: CategoryDTO[];
}

export interface PagedResultDTO<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

export interface ProductListItemDTO {
  id: number;
  name: string;
  price: number;
  coverImageUrl?: string;
  averageRating: number;
  creatorUsername: string;
  isPublic: boolean;
  category: CategoryDTO;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly apiUrl = `${environment.apiUrl}/api/category`;

  constructor(private http: HttpClient) {}

  /**
   * Get all categories in flat structure
   */
  getAllCategories(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(this.apiUrl);
  }

  /**
   * Get categories in hierarchical structure (tree format)
   */
  getCategoriesHierarchy(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.apiUrl}/hierarchy`);
  }

  /**
   * Get a specific category by ID
   */
  getCategoryById(id: number): Observable<CategoryDTO> {
    return this.http.get<CategoryDTO>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get child categories of a specific parent category
   */
  getChildCategories(parentId: number): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(`${this.apiUrl}/${parentId}/children`);
  }

  /**
   * Get products by specific category ID only (not including nested categories)
   */
  getCategoryProducts(categoryId: number, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResultDTO<ProductListItemDTO>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResultDTO<ProductListItemDTO>>(`${this.apiUrl}/${categoryId}/products`, { params });
  }

  /**
   * Get products by category ID including all nested subcategories
   */
  getCategoryProductsIncludeNested(categoryId: number, pageNumber: number = 1, pageSize: number = 10): Observable<PagedResultDTO<ProductListItemDTO>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PagedResultDTO<ProductListItemDTO>>(`${this.apiUrl}/${categoryId}/products/include-nested`, { params });
  }

  /**
   * Create a new category
   */
  createCategory(category: Omit<CategoryDTO, 'id' | 'subcategories'>): Observable<CategoryDTO> {
    return this.http.post<CategoryDTO>(this.apiUrl, category);
  }

  /**
   * Update an existing category
   */
  updateCategory(id: number, category: Omit<CategoryDTO, 'id' | 'subcategories'>): Observable<CategoryDTO> {
    return this.http.put<CategoryDTO>(`${this.apiUrl}/${id}`, category);
  }

  /**
   * Delete a category
   */
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Helper method to convert CategoryDTO to Category interface
   */
  convertToCategory(dto: CategoryDTO): Category {
    return {
      id: dto.id,
      name: dto.name,
      parentId: dto.parentCategoryId,
      subcategories: dto.subcategories?.map(sub => this.convertToCategory(sub))
    };
  }

  /**
   * Helper method to convert Category interface to CategoryDTO
   */
  convertToDTO(category: Category): CategoryDTO {
    return {
      id: category.id,
      name: category.name,
      parentCategoryId: category.parentId,
      subcategories: category.subcategories?.map(sub => this.convertToDTO(sub))
    };
  }
}
