# File Upload Implementation for Product Creation

## Overview

The product creation process now follows a two-step approach to handle file uploads properly:

1. **Step 1**: Create the product with JSON payload (no files)
2. **Step 2**: Upload files separately and update product with URLs

This approach resolves the `415 Unsupported Media Type` error by separating the product creation (JSON) from file uploads (multipart/form-data).

## Implementation Details

### 1. File Upload Service (`src/app/core/services/file-upload.service.ts`)

Created a dedicated service for handling file uploads:

```typescript
@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  // Upload single file to product
  uploadProductFile(productId: number, file: File): Observable<FileUploadResponse>
  
  // Upload multiple files to product
  uploadMultipleProductFiles(productId: number, files: File[]): Observable<FileUploadResponse[]>
  
  // Delete file from product
  deleteProductFile(productId: number, fileId: number): Observable<void>
  
  // Get all files for a product
  getProductFiles(productId: number): Observable<FileUploadResponse[]>
}
```

### 2. Product Creation Component Updates

#### File Handling Properties
- `selectedDigitalProduct?: File` - Main digital product file
- `selectedCoverImage?: File` - Optional cover image
- `selectedPreviewVideo?: File` - Optional preview video
- `imagePreview?: string` - Preview URL for cover image
- `videoPreview?: string` - Preview URL for preview video

#### File Validation Methods
- `isValidDigitalFile(file: File)` - Validates ZIP, RAR, images, videos, documents
- `isValidImageFile(file: File)` - Validates image formats (JPG, PNG, GIF, WebP)
- `isValidVideoFile(file: File)` - Validates video formats (MP4, AVI, MOV, WMV, WebM)

#### File Selection Methods
- `onDigitalProductSelected(event)` - Handles digital product file selection
- `onCoverImageSelected(event)` - Handles cover image selection with preview
- `onPreviewVideoSelected(event)` - Handles preview video selection with preview

#### File Clearing Methods
- `onClearDigitalProduct()` - Clears selected digital product
- `onClearCoverImage()` - Clears selected cover image and preview
- `onClearPreviewVideo()` - Clears selected preview video and preview

### 3. Two-Step Product Creation Process

#### Step 1: Create Product (JSON)
```typescript
const productPayload: ProductCreateRequest = {
  ...this.productForm.value,
  coverImageUrl: this.selectedCoverImage ? 'placeholder' : undefined,
  previewVideoUrl: this.selectedPreviewVideo ? 'placeholder' : undefined
};

this.productService.createProduct(productPayload)
```

#### Step 2: Upload Files and Update Product
```typescript
private uploadFilesAndUpdateProduct(productId: number): void {
  const uploadPromises: Promise<any>[] = [];
  let coverImageUrl: string | undefined;
  let previewVideoUrl: string | undefined;

  // Upload cover image if selected
  if (this.selectedCoverImage) {
    uploadPromises.push(
      this.fileUploadService.uploadProductFile(productId, this.selectedCoverImage!)
        .then((response: any) => {
          coverImageUrl = response?.fileUrl;
        })
    );
  }

  // Upload preview video if selected
  if (this.selectedPreviewVideo) {
    uploadPromises.push(
      this.fileUploadService.uploadProductFile(productId, this.selectedPreviewVideo!)
        .then((response: any) => {
          previewVideoUrl = response?.fileUrl;
        })
    );
  }

  // Upload digital product file (required)
  uploadPromises.push(
    this.fileUploadService.uploadProductFile(productId, this.selectedDigitalProduct!)
  );

  // Wait for all uploads to complete, then update product with real URLs
  Promise.all(uploadPromises)
    .then(async () => {
      const updatePayload: any = {};
      if (coverImageUrl) updatePayload.coverImageUrl = coverImageUrl;
      if (previewVideoUrl) updatePayload.previewVideoUrl = previewVideoUrl;

      if (Object.keys(updatePayload).length > 0) {
        await this.productService.updateProduct(productId, updatePayload).toPromise();
      }
    });
}
```

### 4. Backend API Endpoints

#### Product Creation
- **URL**: `POST /api/Products`
- **Content-Type**: `application/json`
- **Payload**: `ProductCreateRequestDTO` (JSON)

#### File Upload
- **URL**: `POST /api/Products/{productId}/files`
- **Content-Type**: `multipart/form-data`
- **Response**: `FileDTO` with file URL

#### Product Update
- **URL**: `PUT /api/Products/{productId}`
- **Content-Type**: `application/json`
- **Payload**: Partial product updates with file URLs

### 5. Form Validation

#### Required Fields
- Product Name (3-200 characters)
- Price (0.01-1,000,000)
- Currency (exactly 3 characters)
- Product Type (max 50 characters)
- Permalink (3-200 characters, URL-friendly pattern)
- Digital Product File (required)

#### Optional Fields
- Description (max 5000 characters)
- Cover Image File (JPG, PNG, GIF, WebP, max 5MB)
- Preview Video File (MP4, AVI, MOV, WMV, WebM, max 50MB)
- Categories (array of category IDs)
- Tags (array of tag IDs)
- Public Status (boolean)

### 6. User Experience Features

#### File Preview
- Cover images show preview immediately after selection
- Preview videos show video player with controls
- File information displayed with clear/remove options

#### Form Sections
- **Basic Information**: Name, permalink, description
- **Digital Product Files**: File uploads with validation
- **Product Details**: Type, price, currency, public status
- **Categories**: Checkbox grid for category selection
- **Tags**: Checkbox grid for tag selection

#### Visual Feedback
- Loading spinner during creation process
- Success/error messages
- Form validation with field-specific error messages
- Progress indication through disabled states

### 7. Error Handling

#### File Validation Errors
- Invalid file type messages
- File size limit warnings
- Required file missing errors

#### API Errors
- 415 Unsupported Media Type (resolved by two-step approach)
- 400 Bad Request (validation errors)
- 401 Unauthorized (authentication issues)
- 500 Internal Server Error (server issues)

#### User-Friendly Messages
- Specific error messages for different failure scenarios
- Guidance on how to fix validation errors
- Graceful handling of partial failures (product created but file upload failed)

### 8. Security Considerations

#### File Type Validation
- Client-side validation for immediate feedback
- Server-side validation for security
- Whitelist approach for allowed file types

#### File Size Limits
- Digital product: 100MB max
- Cover image: 5MB max
- Preview video: 50MB max

#### Authentication
- All endpoints require valid authentication token
- Creator role verification for product creation
- File uploads associated with authenticated user

### 9. Performance Optimizations

#### Parallel Uploads
- Multiple files uploaded simultaneously using `Promise.all`
- Reduced total upload time

#### File Preview
- Client-side preview generation using `FileReader`
- No server round-trip for preview generation

#### Form Validation
- Real-time validation feedback
- Prevents unnecessary API calls for invalid data

### 10. Future Enhancements

#### Potential Improvements
- Drag and drop file upload interface
- File upload progress indicators
- Image compression before upload
- Video thumbnail generation
- Batch file upload support
- File versioning support

#### Monitoring and Analytics
- Upload success/failure tracking
- File type usage statistics
- Upload time performance metrics
- Error rate monitoring

## Testing

### Manual Testing Checklist
- [ ] Create product with only required fields
- [ ] Create product with all optional fields
- [ ] Upload different file types (ZIP, images, videos)
- [ ] Test file validation (invalid types, oversized files)
- [ ] Test form validation (missing required fields)
- [ ] Test error scenarios (network issues, server errors)
- [ ] Test file preview functionality
- [ ] Test file clearing functionality
- [ ] Test category and tag selection
- [ ] Test responsive design on mobile devices

### Automated Testing
- Unit tests for file validation methods
- Unit tests for form validation
- Integration tests for API calls
- E2E tests for complete product creation flow

## Conclusion

This implementation provides a robust, user-friendly file upload system that properly handles the separation between product creation (JSON) and file uploads (multipart/form-data), resolving the 415 error while maintaining a smooth user experience. 