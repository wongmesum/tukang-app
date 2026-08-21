import { prisma } from "../../shared/prisma";
import type {
  CategoryRecord,
  CreateCategoryInput,
  CreateServiceInput,
  ServiceRecord,
  ServiceRepository,
  UpdateCategoryInput,
  UpdateServiceInput,
} from "./types";
import type { ServiceCategory, Service } from "@prisma/client";

function mapCategory(c: ServiceCategory): CategoryRecord {
  return {
    code: c.code,
    name: c.name,
    iconUrl: c.iconUrl,
    isActive: c.isActive,
  };
}

function mapService(s: Service): ServiceRecord {
  return {
    id: s.id,
    categoryCode: s.categoryCode,
    name: s.name,
    description: s.description,
    baseHourlyRate: s.baseHourlyRate,
    baseDailyRate: s.baseDailyRate,
    minHours: s.minHours,
    isActive: s.isActive,
  };
}

export class PrismaServiceRepository implements ServiceRepository {
  async findCategories(): Promise<CategoryRecord[]> {
    const rows = await prisma.serviceCategory.findMany({
      where: { isActive: true },
    });
    return rows.map(mapCategory);
  }

  async findCategoryByCode(code: string): Promise<CategoryRecord | null> {
    const row = await prisma.serviceCategory.findUnique({
      where: { code },
    });
    return row ? mapCategory(row) : null;
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryRecord> {
    const row = await prisma.serviceCategory.create({
      data: {
        code: input.code.toUpperCase(),
        name: input.name,
        iconUrl: input.iconUrl ?? null,
        isActive: true,
      },
    });
    return mapCategory(row);
  }

  async updateCategory(code: string, input: UpdateCategoryInput): Promise<CategoryRecord> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.iconUrl !== undefined) data.iconUrl = input.iconUrl;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const row = await prisma.serviceCategory.update({
      where: { code },
      data,
    });
    return mapCategory(row);
  }

  async findServicesByCategory(code: string): Promise<ServiceRecord[]> {
    const rows = await prisma.service.findMany({
      where: { categoryCode: code, isActive: true },
    });
    return rows.map(mapService);
  }

  async findServiceById(id: string): Promise<ServiceRecord | null> {
    const row = await prisma.service.findUnique({
      where: { id },
    });
    return row ? mapService(row) : null;
  }

  async findAllServices(): Promise<ServiceRecord[]> {
    const rows = await prisma.service.findMany({
      orderBy: [{ categoryCode: "asc" }, { name: "asc" }],
    });
    return rows.map(mapService);
  }

  async createService(input: CreateServiceInput): Promise<ServiceRecord> {
    const row = await prisma.service.create({
      data: {
        categoryCode: input.categoryCode,
        name: input.name,
        description: input.description ?? null,
        baseHourlyRate: input.baseHourlyRate ?? 30000,
        baseDailyRate: input.baseDailyRate ?? 150000,
        minHours: input.minHours ?? 2,
        isActive: true,
      },
    });
    return mapService(row);
  }

  async updateService(id: string, input: UpdateServiceInput): Promise<ServiceRecord> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.baseHourlyRate !== undefined) data.baseHourlyRate = input.baseHourlyRate;
    if (input.baseDailyRate !== undefined) data.baseDailyRate = input.baseDailyRate;
    if (input.minHours !== undefined) data.minHours = input.minHours;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const row = await prisma.service.update({
      where: { id },
      data,
    });
    return mapService(row);
  }
}
