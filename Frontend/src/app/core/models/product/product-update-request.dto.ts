export interface ProductUpdateRequestDTO {
  id: number; // required
  name: string; // required, 3–200 chars
  description?: string | null; // optional/nullable, max 5000
  price: number; // required, min 0.01, max 1,000,000
  currency: string; // required, exactly 3 chars (e.g. "USD")
  productType: string; // required, max 50
  coverImageUrl?: string | null; // optional/nullable
  previewVideoUrl?: string | null; // optional/nullable
  isPublic: boolean; // required
  permalink: string; // required, regex: ^[a-z0-9]+(?:-[a-z0-9]+)*$
  categoryIds?: number[] | null; // optional/nullable
  tagIds?: number[] | null; // optional/nullable
  status: string; // required, max 50
}


// import { ProductCreateRequestDTO } from "./product-create-request.dto";


// export interface ProductUpdateRequestDTO extends ProductCreateRequestDTO {
//   id: number;
//   status: string;
// }