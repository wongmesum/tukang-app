import { randomUUID } from "crypto";
import type {
  UserRecord,
  CreateUserInput,
  UpdateUserInput,
  UserRepository,
  AddressRecord,
  CreateAddressInput,
  UpdateAddressInput,
  AddressRepository,
} from "./types";

// In-memory user store for testing and development without database
const users = new Map<string, UserRecord>();
const addresses = new Map<string, AddressRecord>();

export class InMemoryUserRepository implements UserRepository {
  async findByPhone(phone: string): Promise<UserRecord | null> {
    for (const user of users.values()) {
      if (user.phone === phone) return user;
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return users.get(id) ?? null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date();
    const user: UserRecord = {
      id: randomUUID(),
      phone: input.phone,
      name: input.name,
      email: null,
      avatarUrl: null,
      role: input.role,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    };
    users.set(user.id, user);
    return user;
  }

  async update(id: string, input: UpdateUserInput): Promise<UserRecord> {
    const user = users.get(id);
    if (!user) throw new Error("User not found");

    const updated: UserRecord = {
      ...user,
      ...input,
      updatedAt: new Date(),
    };
    users.set(id, updated);
    return updated;
  }
}

export class InMemoryAddressRepository implements AddressRepository {
  async findByUserId(userId: string): Promise<AddressRecord[]> {
    const result: AddressRecord[] = [];
    for (const addr of addresses.values()) {
      if (addr.userId === userId) result.push(addr);
    }
    return result;
  }

  async findById(id: string): Promise<AddressRecord | null> {
    return addresses.get(id) ?? null;
  }

  async create(input: CreateAddressInput): Promise<AddressRecord> {
    const addr: AddressRecord = {
      id: randomUUID(),
      ...input,
    };
    addresses.set(addr.id, addr);
    return addr;
  }

  async update(id: string, input: UpdateAddressInput): Promise<AddressRecord> {
    const addr = addresses.get(id);
    if (!addr) throw new Error("Address not found");

    const updated: AddressRecord = { ...addr, ...input };
    addresses.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    addresses.delete(id);
  }

  async clearDefaults(userId: string): Promise<void> {
    for (const [key, addr] of addresses.entries()) {
      if (addr.userId === userId && addr.isDefault) {
        addresses.set(key, { ...addr, isDefault: false });
      }
    }
  }
}

import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaAddressRepository, PrismaUserRepository } from "./prisma-repository";

// ... existing code ...

const memoryUserRepo = new InMemoryUserRepository();
const memoryAddressRepo = new InMemoryAddressRepository();

export const userRepo = shouldUsePrisma() ? new PrismaUserRepository() : memoryUserRepo;
export const addressRepo = shouldUsePrisma() ? new PrismaAddressRepository() : memoryAddressRepo;
