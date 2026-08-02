import { Hono } from "hono";
import { authMiddleware } from "../../shared/auth-middleware";
import { addressRepo, userRepo } from "./repository";
import { createAddressSchema, updateAddressSchema, updateProfileSchema } from "./schema";

const usersRouter = new Hono();
usersRouter.use("/me", authMiddleware);
usersRouter.use("/me/*", authMiddleware);

usersRouter.get("/me", async (context) => {
  const user = context.get("user");
  const record = await userRepo.findById(user.userId);

  if (!record) {
    return context.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User tidak ditemukan",
        },
      },
      404,
    );
  }

  return context.json({
    success: true,
    data: {
      id: record.id,
      phone: record.phone,
      name: record.name,
      email: record.email,
      avatar_url: record.avatarUrl,
      role: record.role,
      is_verified: record.isVerified,
      created_at: record.createdAt.toISOString(),
      updated_at: record.updatedAt.toISOString(),
    },
  });
});

usersRouter.patch("/me", async (context) => {
  const body = await context.req.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  const updated = await userRepo.update(authUser.userId, {
    name: parsed.data.name,
    email: parsed.data.email,
    avatarUrl: parsed.data.avatar_url,
  });

  return context.json({
    success: true,
    data: {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      email: updated.email,
      avatar_url: updated.avatarUrl,
      role: updated.role,
      is_verified: updated.isVerified,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    },
  });
});

usersRouter.get("/me/addresses", async (context) => {
  const authUser = context.get("user");
  const items = await addressRepo.findByUserId(authUser.userId);

  return context.json({
    success: true,
    data: items.map((item) => ({
      id: item.id,
      label: item.label,
      full_address: item.fullAddress,
      lat: item.lat,
      lng: item.lng,
      district: item.district,
      city: item.city,
      is_default: item.isDefault,
    })),
  });
});

usersRouter.post("/me/addresses", async (context) => {
  const body = await context.req.json();
  const parsed = createAddressSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  if (parsed.data.is_default) {
    await addressRepo.clearDefaults(authUser.userId);
  }

  const created = await addressRepo.create({
    userId: authUser.userId,
    label: parsed.data.label,
    fullAddress: parsed.data.full_address,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    district: parsed.data.district,
    city: parsed.data.city,
    isDefault: parsed.data.is_default,
  });

  return context.json({
    success: true,
    data: {
      id: created.id,
      label: created.label,
      full_address: created.fullAddress,
      lat: created.lat,
      lng: created.lng,
      district: created.district,
      city: created.city,
      is_default: created.isDefault,
    },
  });
});

usersRouter.patch("/me/addresses/:id", async (context) => {
  const body = await context.req.json();
  const parsed = updateAddressSchema.safeParse(body);

  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input tidak valid",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const authUser = context.get("user");
  const id = context.req.param("id");
  const existing = await addressRepo.findById(id);

  if (!existing || existing.userId !== authUser.userId) {
    return context.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Alamat tidak ditemukan",
        },
      },
      404,
    );
  }

  if (parsed.data.is_default) {
    await addressRepo.clearDefaults(authUser.userId);
  }

  const updated = await addressRepo.update(id, {
    label: parsed.data.label,
    fullAddress: parsed.data.full_address,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    district: parsed.data.district,
    city: parsed.data.city,
    isDefault: parsed.data.is_default,
  });

  return context.json({
    success: true,
    data: {
      id: updated.id,
      label: updated.label,
      full_address: updated.fullAddress,
      lat: updated.lat,
      lng: updated.lng,
      district: updated.district,
      city: updated.city,
      is_default: updated.isDefault,
    },
  });
});

usersRouter.delete("/me/addresses/:id", async (context) => {
  const authUser = context.get("user");
  const id = context.req.param("id");
  const existing = await addressRepo.findById(id);

  if (!existing || existing.userId !== authUser.userId) {
    return context.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Alamat tidak ditemukan",
        },
      },
      404,
    );
  }

  await addressRepo.delete(id);
  return context.json({ success: true, data: { message: "Alamat berhasil dihapus" } });
});

export { usersRouter };
