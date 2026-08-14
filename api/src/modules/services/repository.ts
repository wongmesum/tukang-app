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
  private categories: CategoryRecord[] = [...CATEGORIES];
  private services: ServiceRecord[] = [...SERVICES];

  async findCategories(): Promise<CategoryRecord[]> {
    return this.categories.filter((c) => c.isActive);
  }

  async findAllCategories(): Promise<CategoryRecord[]> {
    return [...this.categories];
  }

  async findCategoryByCode(code: string): Promise<CategoryRecord | null> {
    return this.categories.find((c) => c.code === code) ?? null;
  }

  async findServicesByCategory(code: string): Promise<ServiceRecord[]> {
    return this.services.filter((s) => s.categoryCode === code && s.isActive);
  }

  async findAllServices(): Promise<ServiceRecord[]> {
    return [...this.services];
  }

  async findServiceById(id: string): Promise<ServiceRecord | null> {
    return this.services.find((s) => s.id === id) ?? null;
  }

  async createCategory(data: CategoryRecord): Promise<CategoryRecord> {
    const existing = this.categories.find((c) => c.code === data.code);
    if (existing) throw new Error(`Category ${data.code} already exists`);
    this.categories.push(data);
    return data;
  }

  async updateCategory(code: string, data: Partial<CategoryRecord>): Promise<CategoryRecord | null> {
    const index = this.categories.findIndex((c) => c.code === code);
    if (index === -1) return null;
    this.categories[index] = { ...this.categories[index], ...data, code };
    return this.categories[index];
  }

  async deleteCategory(code: string): Promise<boolean> {
    const index = this.categories.findIndex((c) => c.code === code);
    if (index === -1) return false;
    this.categories.splice(index, 1);
    // Also remove services in this category
    this.services = this.services.filter((s) => s.categoryCode !== code);
    return true;
  }

  async createService(data: ServiceRecord): Promise<ServiceRecord> {
    this.services.push(data);
    return data;
  }

  async updateService(id: string, data: Partial<ServiceRecord>): Promise<ServiceRecord | null> {
    const index = this.services.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.services[index] = { ...this.services[index], ...data, id };
    return this.services[index];
  }

  async deleteService(id: string): Promise<boolean> {
    const index = this.services.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.services.splice(index, 1);
    return true;
  }
}

const memoryRepo = new InMemoryServiceRepository();
export const serviceRepo = shouldUsePrisma() ? new PrismaServiceRepository() : memoryRepo;
