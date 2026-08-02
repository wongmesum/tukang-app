import { prisma } from "../../shared/prisma";
import type {
  AddressRecord,
  AddressRepository,
  CreateAddressInput,
  CreateUserInput,
  UpdateAddressInput,
  UpdateUserInput,
  UserRecord,
  UserRepository,
} from "./types";

export class PrismaUserRepository implements UserRepository {
  async findByPhone(phone: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return null;
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user = await prisma.user.create({
      data: {
        phone: input.phone,
        name: input.name,
        role: input.role,
      },
    });
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async update(id: string, input: UpdateUserInput): Promise<UserRecord> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      },
    });
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export class PrismaAddressRepository implements AddressRepository {
  async findByUserId(userId: string): Promise<AddressRecord[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        user_id: string;
        label: string;
        full_address: string;
        district: string;
        city: string;
        is_default: boolean;
        lat: number;
        lng: number;
      }>
    >`
      SELECT id, user_id, label, full_address, district, city, is_default,
             ST_Y(location::geometry) as lat,
             ST_X(location::geometry) as lng
      FROM addresses
      WHERE user_id = ${userId}
    `;

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      label: r.label,
      fullAddress: r.full_address,
      lat: r.lat,
      lng: r.lng,
      district: r.district,
      city: r.city,
      isDefault: r.is_default,
    }));
  }

  async findById(id: string): Promise<AddressRecord | null> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        user_id: string;
        label: string;
        full_address: string;
        district: string;
        city: string;
        is_default: boolean;
        lat: number;
        lng: number;
      }>
    >`
      SELECT id, user_id, label, full_address, district, city, is_default,
             ST_Y(location::geometry) as lat,
             ST_X(location::geometry) as lng
      FROM addresses
      WHERE id = ${id}
      LIMIT 1
    `;

    const r = rows[0];
    if (!r) return null;

    return {
      id: r.id,
      userId: r.user_id,
      label: r.label,
      fullAddress: r.full_address,
      lat: r.lat,
      lng: r.lng,
      district: r.district,
      city: r.city,
      isDefault: r.is_default,
    };
  }

  async create(input: CreateAddressInput): Promise<AddressRecord> {
    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO addresses (id, user_id, label, full_address, location, district, city, is_default)
      VALUES (
        ${id},
        ${input.userId},
        ${input.label},
        ${input.fullAddress},
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
        ${input.district},
        ${input.city},
        ${input.isDefault}
      )
    `;

    return {
      id,
      ...input,
    };
  }

  async update(id: string, input: UpdateAddressInput): Promise<AddressRecord> {
    const current = await this.findById(id);
    if (!current) throw new Error("Address not found");

    const label = input.label ?? current.label;
    const fullAddress = input.fullAddress ?? current.fullAddress;
    const lat = input.lat ?? current.lat;
    const lng = input.lng ?? current.lng;
    const district = input.district ?? current.district;
    const city = input.city ?? current.city;
    const isDefault = input.isDefault ?? current.isDefault;

    await prisma.$executeRaw`
      UPDATE addresses
      SET label = ${label},
          full_address = ${fullAddress},
          location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          district = ${district},
          city = ${city},
          is_default = ${isDefault}
      WHERE id = ${id}
    `;

    return {
      id,
      userId: current.userId,
      label,
      fullAddress,
      lat,
      lng,
      district,
      city,
      isDefault,
    };
  }

  async delete(id: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM addresses WHERE id = ${id}`;
  }

  async clearDefaults(userId: string): Promise<void> {
    await prisma.$executeRaw`UPDATE addresses SET is_default = false WHERE user_id = ${userId}`;
  }
}
