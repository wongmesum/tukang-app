export interface CategoryRecord {
  code: string;
  name: string;
  iconUrl: string | null;
  isActive: boolean;
}

export interface CreateCategoryInput {
  code: string;
  name: string;
  iconUrl?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  iconUrl?: string | null;
  isActive?: boolean;
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

export interface CreateServiceInput {
  categoryCode: string;
  name: string;
  description?: string | null;
  baseHourlyRate?: number;
  baseDailyRate?: number;
  minHours?: number;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string | null;
  baseHourlyRate?: number;
  baseDailyRate?: number;
  minHours?: number;
  isActive?: boolean;
}

export interface ServiceRepository {
  findCategories(): Promise<CategoryRecord[]>;
  findCategoryByCode(code: string): Promise<CategoryRecord | null>;
  createCategory(input: CreateCategoryInput): Promise<CategoryRecord>;
  updateCategory(code: string, input: UpdateCategoryInput): Promise<CategoryRecord>;

  findServicesByCategory(code: string): Promise<ServiceRecord[]>;
  findServiceById(id: string): Promise<ServiceRecord | null>;
  findAllServices(): Promise<ServiceRecord[]>;
  createService(input: CreateServiceInput): Promise<ServiceRecord>;
  updateService(id: string, input: UpdateServiceInput): Promise<ServiceRecord>;
}
