import { z } from 'zod';

const baseMetadataSchema = z.object({
  description: z.string(),
});

const digitalMetadataSchema = baseMetadataSchema.extend({
  url: z.string().url(),
});

const physicalMetadataSchema = baseMetadataSchema.extend({
  origin: z.string(),
});

export const itemMetadataSchemas = {
  PHYSICAL: physicalMetadataSchema,
  DIGITAL: digitalMetadataSchema,
};

// Combined schema that validates based on item type
export const itemMetadataSchema = z.discriminatedUnion('itemType', [
  z.object({
    itemType: z.literal('PHYSICAL'),
    ...itemMetadataSchemas.PHYSICAL.shape,
  }),
  z.object({
    itemType: z.literal('DIGITAL'),
    ...itemMetadataSchemas.DIGITAL.shape,
  }),
]);

// Type for TypeScript
export type ItemMetadata = z.infer<typeof itemMetadataSchema>;
