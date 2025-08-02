import { ProductListItemDTO } from './product-list-item.dto';

export interface ProductListItemDTOPagedResultDTO {
  items?: ProductListItemDTO[]; // Nullable array → optional
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
