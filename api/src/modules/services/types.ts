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
  findCategoryByCode(code: string): Promise<CategoryRecord | null>;
  findServicesByCategory(code: string): Promise<ServiceRecord[]>;
  findServiceById(id: string): Promise<ServiceRecord | null>;
}
