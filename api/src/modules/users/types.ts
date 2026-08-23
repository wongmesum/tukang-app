import type { UserRole } from "@prisma/client";

export interface UserRecord {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  phone: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface AddressRecord {
  id: string;
  userId: string;
  label: string;
  fullAddress: string;
  lat: number;
  lng: number;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface CreateAddressInput {
  userId: string;
  label: string;
  fullAddress: string;
  lat: number;
  lng: number;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  fullAddress?: string;
  lat?: number;
  lng?: number;
  district?: string;
  city?: string;
  isDefault?: boolean;
}

export interface UserRepository {
  findByPhone(phone: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  update(id: string, input: UpdateUserInput): Promise<UserRecord>;
}

export interface AddressRepository {
  findByUserId(userId: string): Promise<AddressRecord[]>;
  findById(id: string): Promise<AddressRecord | null>;
  create(input: CreateAddressInput): Promise<AddressRecord>;
  update(id: string, input: UpdateAddressInput): Promise<AddressRecord>;
  delete(id: string): Promise<void>;
  clearDefaults(userId: string): Promise<void>;
}
