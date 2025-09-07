export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  roles?: string[];
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
}

export interface UpdateUserRequest {
  name?: string;
  roles?: string[];
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
}

