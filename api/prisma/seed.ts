// Seed data for TukangNDeso — Mojokerto Kabupaten
// Run with: bunx tsx prisma/seed.ts
// Requires DATABASE_URL set and migrations applied.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { code: "AC", name: "AC & Pendingin", isActive: true },
  { code: "BGN", name: "Bangunan", isActive: true },
  { code: "LST", name: "Listrik", isActive: true },
  { code: "PLB", name: "Plumbing/Pipa", isActive: true },
  { code: "LAS", name: "Las & Besi", isActive: true },
  { code: "TKY", name: "Tukang Kayu", isActive: true },
  { code: "CLN", name: "Cleaning", isActive: true },
  { code: "CAT", name: "Cat & Finishing", isActive: true },
  { code: "TNM", name: "Taman", isActive: true },
];

const services = [
  // AC
  { categoryCode: "AC", name: "Pasang AC Split", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "AC", name: "Cuci AC Split", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "AC", name: "Isi Freon AC", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "AC", name: "Perbaikan AC", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "AC", name: "Bongkar AC", baseHourlyRate: 30000, baseDailyRate: 150000 },
  // Bangunan
  { categoryCode: "BGN", name: "Renovasi Ringan", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "BGN", name: "Plester & Aci", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "BGN", name: "Pasang Keramik", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "BGN", name: "Perbaikan Atap", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "BGN", name: "Bongkar Bangunan", baseHourlyRate: 30000, baseDailyRate: 150000 },
  // Listrik
  { categoryCode: "LST", name: "Instalasi Listrik Baru", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "LST", name: "Perbaikan Listrik", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "LST", name: "Tambah Daya", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "LST", name: "Pasang Lampu/Stop Kontak", baseHourlyRate: 30000, baseDailyRate: 150000 },
  // Plumbing
  { categoryCode: "PLB", name: "Saluran Mampet", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "PLB", name: "Instalasi Pipa", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "PLB", name: "Perbaikan WC/Toilet", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "PLB", name: "Pasang Pompa Air", baseHourlyRate: 30000, baseDailyRate: 150000 },
  // Las
  { categoryCode: "LAS", name: "Pagar Besi", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "LAS", name: "Kanopi", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "LAS", name: "Teralis", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "LAS", name: "Railing Tangga", baseHourlyRate: 30000, baseDailyRate: 150000 },
  // Kayu
  { categoryCode: "TKY", name: "Kusen & Pintu", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "TKY", name: "Lemari Custom", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "TKY", name: "Plafon Kayu/PVC", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "TKY", name: "Partisi Ruangan", baseHourlyRate: 30000, baseDailyRate: 150000 },
  // Cleaning
  { categoryCode: "CLN", name: "Bersih Rumah", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "CLN", name: "Poles Lantai", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "CLN", name: "Buang Puing", baseHourlyRate: 30000, baseDailyRate: 150000 },
  // Cat
  { categoryCode: "CAT", name: "Cat Interior", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "CAT", name: "Cat Eksterior", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "CAT", name: "Waterproofing", baseHourlyRate: 30000, baseDailyRate: 150000 },
  // Taman
  { categoryCode: "TNM", name: "Landscaping", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "TNM", name: "Potong Rumput", baseHourlyRate: 30000, baseDailyRate: 150000 },
  { categoryCode: "TNM", name: "Taman & Kolam", baseHourlyRate: 30000, baseDailyRate: 150000 },
];

async function main() {
  console.log("Seeding categories...");
  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, isActive: cat.isActive },
      create: cat,
    });
  }
  console.log(`  ${categories.length} categories upserted.`);

  console.log("Seeding services...");
  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: `seed-${svc.categoryCode}-${svc.name.replace(/\s+/g, "-").toLowerCase()}` },
      update: {},
      create: {
        id: `seed-${svc.categoryCode}-${svc.name.replace(/\s+/g, "-").toLowerCase()}`,
        categoryCode: svc.categoryCode,
        name: svc.name,
        baseHourlyRate: svc.baseHourlyRate,
        baseDailyRate: svc.baseDailyRate,
        minHours: 2,
        isActive: true,
      },
    });
  }
  console.log(`  ${services.length} services upserted.`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
