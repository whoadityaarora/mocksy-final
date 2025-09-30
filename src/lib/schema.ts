import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export const brandFormSchema = z.object({
  brandName: z.string().min(1, { message: "Brand name is required." }),
  merchandise: z.string().min(1, { message: "Please list merchandise items." }),
  mainColor: z.string().min(1, { message: "A main color is required." }),
  style: z.string(),
  logoFile: z
    .any()
    .refine((files) => files?.length === 1, "Logo image is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, and .png formats are supported."
    ),
});
