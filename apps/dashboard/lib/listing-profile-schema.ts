import { z } from "zod";

const TimeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM (24h)");

const ListingServiceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().nonnegative().optional(),
  priceType: z.enum(["fixed", "hourly", "variable", "starting_at"]).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  durationMinutes: z.number().int().positive().max(24 * 60).optional(),
  description: z.string().trim().max(1000).optional(),
  featured: z.boolean().optional(),
});

const ListingPackageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().nonnegative().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  description: z.string().trim().max(1500).optional(),
  includedServiceNames: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});

const DayHoursSchema = z
  .object({
    open: z.boolean(),
    openTime: TimeHHMM.optional(),
    closeTime: TimeHHMM.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.open && (!val.openTime || !val.closeTime)) {
      ctx.addIssue({ code: "custom", message: "openTime/closeTime required when open=true" });
    }
    if (!val.open && (val.openTime || val.closeTime)) {
      ctx.addIssue({ code: "custom", message: "Do not set times when open=false" });
    }
  });

const HoursSchema = z.object({
  mon: DayHoursSchema,
  tue: DayHoursSchema,
  wed: DayHoursSchema,
  thu: DayHoursSchema,
  fri: DayHoursSchema,
  sat: DayHoursSchema,
  sun: DayHoursSchema,
});

export const ListingCustomFieldsSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    category: z.string().trim().min(1).max(80).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(30).optional(),
    tagline: z.string().trim().max(140).optional(),
    contact: z
      .object({
        phone: z.string().trim().max(40).optional(),
        email: z.string().trim().email().optional(),
        website: z.string().trim().max(200).optional(),
        bookingUrl: z.string().trim().url().optional(),
        whatsappUrl: z.string().trim().url().optional(),
      })
      .optional(),
    providerProfile: z
      .object({
        businessName: z.string().trim().max(120).optional(),
        ownerName: z.string().trim().max(120).optional(),
        yearsExperience: z.number().int().min(0).max(100).optional(),
        certifications: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
        insured: z.boolean().optional(),
        licenseNumber: z.string().trim().max(80).optional(),
        logoUrl: z.string().trim().url().optional(),
      })
      .optional(),
    serviceArea: z
      .object({
        serviceMode: z.enum(["mobile", "in_store", "both"]).optional(),
        radius: z.number().nonnegative().max(500).optional(),
        radiusUnit: z.enum(["mi", "km"]).optional(),
      })
      .optional(),
    services: z.array(ListingServiceSchema).max(100).optional(),
    packages: z.array(ListingPackageSchema).max(50).optional(),
    hours: HoursSchema.optional(),
    social: z
      .object({
        instagram: z.string().trim().max(200).optional(),
        facebook: z.string().trim().max(200).optional(),
        tiktok: z.string().trim().max(200).optional(),
        linkedin: z.string().trim().max(200).optional(),
        youtube: z.string().trim().max(200).optional(),
        x: z.string().trim().max(200).optional(),
      })
      .optional(),
    features: z
      .object({
        parking: z.boolean().optional(),
        petFriendly: z.boolean().optional(),
        mobileService: z.boolean().optional(),
        organicProducts: z.boolean().optional(),
        certifiedGroomers: z.boolean().optional(),
        pickupDropoff: z.boolean().optional(),
        spaServices: z.boolean().optional(),
        ecoFriendly: z.boolean().optional(),
        custom: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
      })
      .optional(),
  })
  .strip();

export type ListingCustomFields = z.infer<typeof ListingCustomFieldsSchema>;
