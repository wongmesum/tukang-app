import { Hono } from "hono";
import { env } from "../../config/env";
import { generateTokenPair } from "../auth/jwt";
import { userRepo } from "../users/repository";
import { walletRepo, workerRepo } from "../workers/repository";

const MOJOKERTO_LOCATIONS = [
  { lat: -7.4722, lng: 112.4336, district: "Mojosari" },
  { lat: -7.4580, lng: 112.4200, district: "Sooko" },
  { lat: -7.4900, lng: 112.4100, district: "Puri" },
  { lat: -7.5100, lng: 112.3900, district: "Trowulan" },
  { lat: -7.4650, lng: 112.4500, district: "Bangsal" },
];

const WORKER_SKILLS: string[][] = [
  ["AC", "LST"],
  ["BGN", "CAT"],
  ["PLB", "LAS"],
  ["AC", "BGN", "LST"],
  ["TKY", "CLN", "TNM"],
];

const seedRouter = new Hono();

seedRouter.post("/demo", async (context) => {
  if (env.NODE_ENV === "production") {
    return context.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      404,
    );
  }

  const customers: Array<{ phone: string; name: string; token: string }> = [];
  for (let i = 1; i <= 3; i += 1) {
    const phone = `0812300000${String(i).padStart(2, "0")}`;
    let user = await userRepo.findByPhone(phone);
    user ??= await userRepo.create({
      phone,
      name: `Pelanggan Demo ${i}`,
      role: "customer",
    });
    const tokens = generateTokenPair({ userId: user.id, role: user.role });
    customers.push({ phone: user.phone, name: user.name, token: tokens.token });
  }

  const workers: Array<{
    phone: string;
    name: string;
    skills: string[];
    token: string;
  }> = [];
  for (let i = 1; i <= 5; i += 1) {
    const phone = `0856700000${String(i).padStart(2, "0")}`;
    let user = await userRepo.findByPhone(phone);
    user ??= await userRepo.create({
      phone,
      name: `Tukang Demo ${i}`,
      role: "worker",
    });
    const tokens = generateTokenPair({ userId: user.id, role: user.role });

    const existing = await workerRepo.findByUserId(user.id);
    if (!existing) {
      const loc = MOJOKERTO_LOCATIONS[i - 1] ?? MOJOKERTO_LOCATIONS[0]!;
      const skills = WORKER_SKILLS[i - 1] ?? ["AC"];
      await workerRepo.create({
        userId: user.id,
        ktpNumber: `320${i}012345678901`,
        ktpPhotoUrl: `https://cdn.tukangndeso.id/ktp/demo-${i}.jpg`,
        bio: `Tukang berpengalaman di ${loc.district}`,
        workRadiusKm: 20,
        homeLocation: { lat: loc.lat, lng: loc.lng },
        skills,
      });
      await workerRepo.update(user.id, { status: "active", isAvailable: true });
    }
    await walletRepo.ensureFor(user.id);
    workers.push({
      phone: user.phone,
      name: user.name,
      skills: WORKER_SKILLS[i - 1] ?? ["AC"],
      token: tokens.token,
    });
  }

  const adminPhone = "081200000099";
  let admin = await userRepo.findByPhone(adminPhone);
  admin ??= await userRepo.create({
    phone: adminPhone,
    name: "Admin Dev",
    role: "admin",
  });
  const adminTokens = generateTokenPair({ userId: admin.id, role: admin.role });

  return context.json({
    success: true,
    data: {
      customers,
      workers,
      admin: {
        phone: admin.phone,
        name: admin.name,
        token: adminTokens.token,
      },
      note: "Data seed hanya untuk development. Copy token dan paste di Dev Console.",
    },
  });
});

export { seedRouter };
