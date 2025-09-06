export interface User {
  id: string;
  email: string;
  name: string;
  roles: ('admin' | 'user')[];
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  roles?: ('admin' | 'user')[];
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  roles?: ('admin' | 'user')[];
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  isActive?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
}

