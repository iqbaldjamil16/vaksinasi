import { z } from 'zod';

export const treatmentSchema = z.object({
  medicineType: z.string().min(1, "Wajib diisi."),
  medicineName: z.string().min(1, "Wajib diisi."),
  dosageValue: z.coerce.number().gt(0, "Dosis harus lebih dari 0."),
  dosageUnit: z.string().min(1, "Wajib diisi."),
});

export const caseDevelopmentEntrySchema = z.object({
  status: z.string().min(1, "Wajib diisi."),
  count: z.coerce.number().min(1, "Jumlah harus minimal 1."),
});

export const vaccinationDetailSchema = z.object({
  vaccineName: z.string().optional().or(z.literal("")),
  animalType: z.string().min(1, "Jenis hewan wajib diisi."),
  animalCount: z.coerce.number().min(1, "Jumlah hewan harus minimal 1."),
  gender: z.string().optional().or(z.literal("")),
  age: z.coerce.number().optional().or(z.literal("")),
  ageUnit: z.string().optional().or(z.literal("")),
});


export const serviceSchema = z.object({
  id: z.string().optional(),
  date: z.date({
    required_error: "Wajib diisi.",
  }),
  puskeswan: z.string().min(1, "Wajib diisi."),
  officerName: z.string().min(1, "Wajib diisi."),
  ownerName: z.string().min(1, "Wajib diisi."),
  ownerAddress: z.string().min(1, "Wajib diisi."),
  nik: z.string().nullable().optional().or(z.literal("")).refine(
    (val) => !val || /^\d{16}$/.test(val), {
    message: "NIK harus terdiri dari 16 angka.",
  }),
  phoneNumber: z.string().nullable().optional().or(z.literal("")).refine(
    (val) => !val || /^(\+62|0)8[1-9][0-9]{7,11}$/.test(val), {
    message: "Format No. HP tidak valid. Contoh: 081234567890",
  }),
  
  vaccinationProgram: z.string().min(1, "Program vaksinasi wajib diisi."),
  vaccineName: z.string().min(1, "Jenis vaksin wajib diisi."),
  
  vaccinations: z.array(vaccinationDetailSchema).min(1, "Minimal satu detail vaksinasi harus ditambahkan."),
  
  treatments: z.array(treatmentSchema).optional().default([]),
  
  caseDevelopments: z.array(caseDevelopmentEntrySchema).optional(),
  
  // Legacy fields for backward compatibility
  livestockType: z.string().optional(),
  livestockCount: z.coerce.number().optional(),
  caseDevelopment: z.string().optional(),

}).superRefine((data, ctx) => {
  if (data.caseDevelopments && data.caseDevelopments.length > 0) {
    const totalDevelopmentCount = data.caseDevelopments.reduce((sum, dev) => sum + dev.count, 0);
    const totalAnimalCount = data.vaccinations.reduce((sum, v) => sum + v.animalCount, 0);
    
    if (totalDevelopmentCount > totalAnimalCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total jumlah pada perkembangan kasus (${totalDevelopmentCount}) tidak boleh melebihi jumlah ternak (${totalAnimalCount}).`,
        path: ["caseDevelopments"],
      });
    }
  }
});

export type HealthcareService = z.infer<typeof serviceSchema>;
export type Treatment = z.infer<typeof treatmentSchema>;
export type CaseDevelopmentEntry = z.infer<typeof caseDevelopmentEntrySchema>;
export type VaccinationDetail = z.infer<typeof vaccinationDetailSchema>;