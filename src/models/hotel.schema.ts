import { z } from "zod";

export const HotelQuerySchema = z
  .object({
    city: z.string().min(1, "City parameter is required"),
    minPrice: z.coerce.number().nonnegative("minPrice must be non-negative").optional(),
    maxPrice: z.coerce.number().positive("maxPrice must be positive").optional(),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.maxPrice >= data.minPrice;
      }
      return true;
    },
    {
      message: "maxPrice must be greater than or equal to minPrice",
      path: ["maxPrice"],
    }
  );

export type HotelQueryInput = z.infer<typeof HotelQuerySchema>;

