export interface CreateAdminUserDTO {
    email: string;
    username: string;
    password: string;
    role: 'Creator' | 'Admin'; // Based on your actual roles
  }
  