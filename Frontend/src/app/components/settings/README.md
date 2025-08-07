# Settings Component

This component provides comprehensive user settings functionality for the Raqmiya platform.

## Features

### Profile Management
- **Profile Information Update**: Users can update their username and profile description
- **Profile Picture Management**: 
  - Upload profile images (JPG, PNG, GIF up to 5MB)
  - Remove profile pictures (reverts to default avatar)
  - Real-time image preview
  - File validation (size and type)
- **Default Avatar**: Every user has a default avatar that displays when no custom image is set

### Security Settings
- **Password Change**: 
  - Current password verification
  - New password with strength requirements
  - Password confirmation
  - Real-time password strength indicator
  - SMTP email notification on successful password change
- **Password Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

### Email Notifications
- **SMTP Integration**: Password change notifications sent via email
- **HTML Email Templates**: Professional email templates for notifications
- **Async Processing**: Email sending doesn't block the UI

## File Structure

```
settings/
├── settings.ts              # Main settings component
├── settings.html            # Settings layout template
├── settings.css             # Settings styles
├── profile/
│   ├── profile.ts           # Profile management component
│   ├── profile.html         # Profile form template
│   └── profile.css          # Profile-specific styles
├── security/
│   ├── security.ts          # Security settings component
│   ├── security.html        # Security form template
│   └── security.css         # Security-specific styles
└── payment/
    ├── payment.ts           # Payment settings component
    ├── payment.html         # Payment form template
    └── payment.css          # Payment-specific styles
```

## Backend Integration

### API Endpoints
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `POST /api/users/me/change-password` - Change password
- `POST /api/users/me/upload-image` - Upload profile image

### DTOs
- `UserProfileDTO` - User profile data
- `UserUpdateDTO` - Profile update request
- `ChangePasswordDTO` - Password change request
- `UserProfileUpdateResponseDTO` - Profile update response
- `ChangePasswordResponseDTO` - Password change response
- `UploadImageResponseDTO` - Image upload response

### Services
- `UserService` - Frontend service for user operations
- `EmailService` - Backend service for SMTP notifications

## Configuration

### Email Settings (appsettings.json)
```json
{
  "Email": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "Username": "your-email@gmail.com",
    "Password": "your-app-password",
    "FromEmail": "noreply@raqmiya.com",
    "FromName": "Raqmiya"
  }
}
```

### File Upload Settings
- Maximum file size: 5MB
- Allowed formats: JPG, PNG, GIF
- Storage location: `/wwwroot/uploads/profile-images/`
- File naming: `{userId}_{timestamp}.{extension}`

## Usage

### Profile Update
```typescript
// Update profile information
const updateData: UserProfileUpdateRequest = {
  username: 'newUsername',
  profileDescription: 'Updated description',
  profileImageUrl: 'new-image-url'
};

this.userService.updateProfile(updateData).subscribe({
  next: (response) => {
    if (response.success) {
      // Handle success
    }
  }
});
```

### Password Change
```typescript
// Change password
const passwordData: ChangePasswordRequest = {
  currentPassword: 'oldPassword',
  newPassword: 'newSecurePassword'
};

this.userService.changePassword(passwordData).subscribe({
  next: (response) => {
    if (response.success) {
      // Email notification will be sent automatically
    }
  }
});
```

### Image Upload
```typescript
// Upload profile image
const file: File = // ... file from input
this.userService.uploadProfileImage(file).subscribe({
  next: (response) => {
    if (response.success) {
      // Handle successful upload
    }
  }
});
```

## Error Handling

The component includes comprehensive error handling:
- Form validation errors
- API error responses
- File upload errors
- Network errors
- User-friendly error messages

## Security Features

- JWT authentication required for all operations
- Password hashing with PBKDF2
- File type validation
- File size limits
- CSRF protection
- Input sanitization

## Responsive Design

The component is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## Dependencies

### Frontend
- Angular 17+
- RxJS
- Angular Forms

### Backend
- .NET 8
- Entity Framework Core
- AutoMapper
- FluentValidation
- System.Net.Mail (SMTP)

## Future Enhancements

- Two-factor authentication
- Account deletion
- Data export functionality
- Notification preferences
- Privacy settings
- Social media integration
