namespace API.Constants
{
    public static class LogMessages
    {
        public const string AdminUserCreateError = "Error creating admin user: {Message}";
        public const string UserListError = "Error listing users";
        public const string UserGetByIdError = "Error getting user by id";
        public const string UserDeactivateError = "Error deactivating user";
        public const string ProductGetByPermalinkError = "Error getting product by permalink";
        public const string UserGetProfileError = "Error getting current user profile";
        public const string UserUpdateProfileError = "Error updating user profile";
        public const string RegistrationAttempt = "Registration attempt received: Email={Email}, Username={Username}, Role={Role}";
        public const string RegistrationModelValidationFailed = "Model validation failed: {Errors}";
        public const string RegistrationError = "Error during user registration: {Message}";
        public const string LoginAttempt = "Login attempt received: EmailOrUsername={EmailOrUsername}";
        public const string LoginModelValidationFailed = "Login model validation failed: {Errors}";
        public const string LoginSuccess = "Login successful for user: {EmailOrUsername}";
        public const string LoginFailed = "Login failed for user: {EmailOrUsername}, Reason: {Reason}";
        public const string LoginError = "Error during user login: {Message}";
    }
}

