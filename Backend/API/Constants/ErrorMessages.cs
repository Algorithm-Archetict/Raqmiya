namespace API.Constants
{
    public static class ErrorMessages
    {
        public const string AdminUserCreate = "An error occurred while creating the admin user.";
        public const string UserList = "An error occurred while listing users.";
        public const string UserGetById = "An error occurred while fetching the user.";
        public const string UserDeactivate = "An error occurred while deactivating the user.";
        public const string ProductGetByPermalink = "An error occurred while fetching the product.";
        public const string UserGetProfile = "An error occurred while fetching the profile.";
        public const string UserUpdateProfile = "An error occurred while updating the profile.";
        public const string UserCurrentPasswordIncorrect = "Current password is incorrect.";
        public const string AdminRegistrationForbidden = "Only authenticated admins can create new admin accounts.";
        public const string RegistrationError = "An internal server error occurred during registration.";
        public const string LoginError = "An internal server error occurred during login.";
    }
}

