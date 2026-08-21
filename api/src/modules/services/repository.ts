import { randomUUID } from "crypto";
import type {
  CategoryRecord,
  CreateCategoryInput,
  CreateServiceInput,
  ServiceRecord,
  ServiceRepository,
  UpdateCategoryInput,
  UpdateServiceInput,
} from "./types";
import { shouldUsePrisma } from "../../shared/repository-factory";
import { PrismaServiceRepository } from "./prisma-repository";

const CATEGORIES: CategoryRecord[] = [
  { code: "AC", name: "AC & Pendingin", iconUrl: null, isActive: true },
  { code: "BGN", name: "Bangunan", iconUrl: null, isActive: true },
  { code: "LST", name: "Listrik", iconUrl: null, isActive: true },
  { code: "PLB", name: "Plumbing/Pipa", iconUrl: null, isActive: true },
  { code: "LAS", name: "Las & Besi", iconUrl: null, isActive: true },
  { code: "TKY", name: "Tukang Kayu", iconUrl: null, isActive: true },
  { code: "CLN", name: "Cleaning", iconUrl: null, isActive: true },
  { code: "CAT", name: "Cat & Finishing", iconUrl: null, isActive: true },
  { code: "TNM", name: "Taman", iconUrl: null, isActive: true },
];

const SERVICES: ServiceRecord[] = [
  { id: "seed-AC-pasang-ac-split", categoryCode: "AC", name: "Pasang AC Split", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-AC-cuci-ac-split", categoryCode: "AC", name: "Cuci AC Split", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-AC-isi-freon-ac", categoryCode: "AC", name: "Isi Freon AC", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-AC-perbaikan-ac", categoryCode: "AC", name: "Perbaikan AC", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-AC-bongkar-ac", categoryCode: "AC", name: "Bongkar AC", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-BGN-renovasi-ringan", categoryCode: "BGN", name: "Renovasi Ringan", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-BGN-plester-&-aci", categoryCode: "BGN", name: "Plester & Aci", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-BGN-pasang-keramik", categoryCode: "BGN", name: "Pasang Keramik", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-BGN-perbaikan-atap", categoryCode: "BGN", name: "Perbaikan Atap", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-LST-instalasi-listrik-baru", categoryCode: "LST", name: "Instalasi Listrik Baru", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-LST-perbaikan-listrik", categoryCode: "LST", name: "Perbaikan Listrik", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-PLB-saluran-mampet", categoryCode: "PLB", name: "Saluran Mampet", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-PLB-instalasi-pipa", categoryCode: "PLB", name: "Instalasi Pipa", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
];

export class InMemoryServiceRepository implements ServiceRepository {
  async findCategories(): Promise<CategoryRecord[]> {
    return CATEGORIES.filter((c) => c.isActive);
  }

  async findCategoryByCode(code: string): Promise<CategoryRecord | null> {
    return CATEGORIES.find((c) => c.code === code) ?? null;
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryRecord> {
    const record: CategoryRecord = {
      code: input.code.toUpperCase(),
      name: input.name,
      iconUrl: input.iconUrl ?? null,
      isActive: true,
    };
    CATEGORIES.push(record);
    return record;
  }

  async updateCategory(code: string, input: UpdateCategoryInput): Promise<CategoryRecord> {
    const idx = CATEGORIES.findIndex((c) => c.code === code);
    if (idx === -1) throw new Error("Category not found");
    const current = CATEGORIES[idx]!;
    const updated: CategoryRecord = {
      ...current,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };
    CATEGORIES[idx] = updated;
    return updated;
  }

  async findServicesByCategory(code: string): Promise<ServiceRecord[]> {
    return SERVICES.filter((s) => s.categoryCode === code && s.isActive);
  }

  async findServiceById(id: string): Promise<ServiceRecord | null> {
    return SERVICES.find((s) => s.id === id) ?? null;
  }

  async findAllServices(): Promise<ServiceRecord[]> {
    return [...SERVICES];
  }

  async createService(input: CreateServiceInput): Promise<ServiceRecord> {
    const record: ServiceRecord = {
      id: randomUUID(),
      categoryCode: input.categoryCode,
      name: input.name,
      description: input.description ?? null,
      baseHourlyRate: input.baseHourlyRate ?? 30000,
      baseDailyRate: input.baseDailyRate ?? 150000,
      minHours: input.minHours ?? 2,
      isActive: true,
    };
    SERVICES.push(record);
    return record;
  }

  async updateService(id: string, input: UpdateServiceInput): Promise<ServiceRecord> {
    const idx = SERVICES.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Service not found");
    const current = SERVICES[idx]!;
    const updated: ServiceRecord = {
      ...current,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.baseHourlyRate !== undefined && { baseHourlyRate: input.baseHourlyRate }),
      ...(input.baseDailyRate !== undefined && { baseDailyRate: input.baseDailyRate }),
      ...(input.minHours !== undefined && { minHours: input.minHours }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };
    SERVICES[idx] = updated;
    return updated;
  }
}

const memoryRepo = new InMemoryServiceRepository();
export const serviceRepo: ServiceRepository = shouldUsePrisma() ? new PrismaServiceRepository() : memoryRepo;
