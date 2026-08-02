import { prisma } from "../../shared/prisma";
import type { CategoryRecord, ServiceRecord, ServiceRepository } from "./types";
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
}
