import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const fileSchema = z
  .any()
  .refine((file) => file?.size, "Logo image is required.")
  .refine((file) => file?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
    "Only .jpg, .jpeg, and .png formats are supported."
  );

export const brandFormSchema = z.object({
  brandName: z.string().min(1, { message: "Brand name is required." }),
  merchandise: z.string().min(1, { message: "Please list merchandise items." }),
  mainColor: z.string().min(1, { message: "A main color is required." }),
  style: z.string(),
  logoFile: z.preprocess((arg) => {
    // Convert FileList to a single file for validation
    if (arg instanceof FileList) {
      return arg.item(0);
    }
    return arg;
  }, fileSchema),
});
