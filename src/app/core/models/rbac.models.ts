export interface AppPermission {
  id: number;
  code: string;
  name: string;
  description?: string;
  module: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RoleDefinition {
  id: number;
  code: string;
  name: string;
  description?: string;
  permissions: Pick<AppPermission, 'id' | 'code' | 'name' | 'module'>[];
  permission_count: number;
  user_count: number;
  is_system: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPermissionsPayload {
  role: string;
  role_name: string;
  permission_codes: string[];
  permissions: AppPermission[];
}

export interface RoleWritePayload {
  code: string;
  name: string;
  description?: string;
  permission_ids?: number[];
  is_active?: boolean;
}

export interface PermissionWritePayload {
  code: string;
  name: string;
  description?: string;
  module: string;
  is_active?: boolean;
}
