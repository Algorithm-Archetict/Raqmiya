export interface CreateAdminUserDTO {
  email: string;
  username: string;
  password: string;
  role: 'Admin' | 'Creator' | 'Customer';
}
  