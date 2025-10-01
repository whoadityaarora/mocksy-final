import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];

export const brandFormSchema = z.object({
  brandName: z.string().optional(),
  merchandise: z.string().min(1, { message: "Please list merchandise items." }),
  mainColor: z.string().min(1, { message: "A main color is required." }),
  style: z.string().min(1, { message: "Please select a design style."}),
  logoFile: z.instanceof(File, { message: "Logo image is required." })
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp and .heic formats are supported."
    ),
});
