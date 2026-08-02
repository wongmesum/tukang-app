import type { CategoryRecord, ServiceRecord, ServiceRepository } from "./types";
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
  // AC
  { id: "seed-AC-pasang-ac-split", categoryCode: "AC", name: "Pasang AC Split", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-AC-cuci-ac-split", categoryCode: "AC", name: "Cuci AC Split", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-AC-isi-freon-ac", categoryCode: "AC", name: "Isi Freon AC", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-AC-perbaikan-ac", categoryCode: "AC", name: "Perbaikan AC", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  { id: "seed-AC-bongkar-ac", categoryCode: "AC", name: "Bongkar AC", description: null, baseHourlyRate: 30000, baseDailyRate: 150000, minHours: 2, isActive: true },
  // Bangunan
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

  async findServicesByCategory(code: string): Promise<ServiceRecord[]> {
    return SERVICES.filter((s) => s.categoryCode === code && s.isActive);
  }

  async findServiceById(id: string): Promise<ServiceRecord | null> {
    return SERVICES.find((s) => s.id === id) ?? null;
  }
}

const memoryRepo = new InMemoryServiceRepository();
export const serviceRepo = shouldUsePrisma() ? new PrismaServiceRepository() : memoryRepo;
