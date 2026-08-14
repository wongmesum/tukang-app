export interface CategoryRecord {
  code: string;
  name: string;
  iconUrl: string | null;
  isActive: boolean;
}

export interface ServiceRecord {
  id: string;
  categoryCode: string;
  name: string;
  description: string | null;
  baseHourlyRate: number;
  baseDailyRate: number;
  minHours: number;
  isActive: boolean;
}

export interface ServiceRepository {
  findCategories(): Promise<CategoryRecord[]>;
  findAllCategories(): Promise<CategoryRecord[]>;
  findCategoryByCode(code: string): Promise<CategoryRecord | null>;
  findServicesByCategory(code: string): Promise<ServiceRecord[]>;
  findAllServices(): Promise<ServiceRecord[]>;
  findServiceById(id: string): Promise<ServiceRecord | null>;
  createCategory(data: CategoryRecord): Promise<CategoryRecord>;
  updateCategory(code: string, data: Partial<CategoryRecord>): Promise<CategoryRecord | null>;
  deleteCategory(code: string): Promise<boolean>;
  createService(data: ServiceRecord): Promise<ServiceRecord>;
  updateService(id: string, data: Partial<ServiceRecord>): Promise<ServiceRecord | null>;
  deleteService(id: string): Promise<boolean>;
}
