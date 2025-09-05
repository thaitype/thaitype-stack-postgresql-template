export interface User {
  id: string;
  email: string;
  name: string;
  roles: ('admin')[];
  bio?: string;
  avatar?: string;
  website?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  roles?: ('admin')[];
  bio?: string;
  avatar?: string;
  website?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  roles?: ('admin')[];
  bio?: string;
  avatar?: string;
  website?: string;
  isActive?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  avatar?: string;
  website?: string;
}

