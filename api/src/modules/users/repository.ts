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

const users = new Map<string, UserRecord>();
const addresses = new Map<string, AddressRecord>();

export class InMemoryUserRepository implements UserRepository {
  async findByPhone(phone: string): Promise<UserRecord | null> {
    for (const user of users.values()) if (user.phone === phone) return user;
    return null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of users.values()) {
      if (user.email?.toLowerCase() === normalized) return user;
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
    const updated = { ...user, ...input, updatedAt: new Date() };
    users.set(id, updated);
    return updated;
  }
}

export class InMemoryAddressRepository implements AddressRepository {
  async findByUserId(userId: string): Promise<AddressRecord[]> {
    return [...addresses.values()].filter((address) => address.userId === userId);
  }

  async findById(id: string): Promise<AddressRecord | null> {
    return addresses.get(id) ?? null;
  }

  async create(input: CreateAddressInput): Promise<AddressRecord> {
    const address = { id: randomUUID(), ...input };
    addresses.set(address.id, address);
    return address;
  }

  async update(id: string, input: UpdateAddressInput): Promise<AddressRecord> {
    const address = addresses.get(id);
    if (!address) throw new Error("Address not found");
    const updated = { ...address, ...input };
    addresses.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    addresses.delete(id);
  }

  async clearDefaults(userId: string): Promise<void> {
    for (const [id, address] of addresses.entries()) {
      if (address.userId === userId && address.isDefault) {
        addresses.set(id, { ...address, isDefault: false });
      }
    }
  }
}

import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaAddressRepository, PrismaUserRepository } from "./prisma-repository";

const memoryUserRepo = new InMemoryUserRepository();
const memoryAddressRepo = new InMemoryAddressRepository();

export const userRepo = shouldUsePrisma() ? new PrismaUserRepository() : memoryUserRepo;
export const addressRepo = shouldUsePrisma() ? new PrismaAddressRepository() : memoryAddressRepo;
