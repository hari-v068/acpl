import { z } from 'zod';

// Base properties all items share
const baseMetadataSchema = z.object({
  description: z.string(),
});

// Digital item specific properties
const digitalMetadataSchema = baseMetadataSchema.extend({
  url: z.string().url(),
});

// Physical item specific properties
const physicalMetadataSchema = baseMetadataSchema.extend({
  origin: z.string(),
});

// Specific item type schemas
export const itemMetadataSchemas = {
  // LEMONADE: physicalMetadataSchema.extend({
  //   flavor: z.string().optional(),
  // }),

  // LEMON: physicalMetadataSchema.extend({
  //   freshness: z.string().optional(),
  // }),

  // PERMIT: digitalMetadataSchema.extend({
  //   validUntil: z.string().datetime().optional(),
  //   permitType: z.string().optional(),
  // }),

  // POSTER: digitalMetadataSchema.extend({
  //   dimensions: z.string().optional(),
  //   resolution: z.string().optional(),
  //   requirements: z.string().optional(),
  // }),

  PHYSICAL: physicalMetadataSchema,
  DIGITAL: digitalMetadataSchema,
};

// Combined schema that validates based on item type
export const itemMetadataSchema = z.discriminatedUnion('itemType', [
  // z.object({
  //   itemType: z.literal('LEMON'),
  //   ...itemMetadataSchemas.LEMON.shape,
  // }),
  // z.object({
  //   itemType: z.literal('LEMONADE'),
  //   ...itemMetadataSchemas.LEMONADE.shape,
  // }),
  // z.object({
  //   itemType: z.literal('POSTER'),
  //   ...itemMetadataSchemas.POSTER.shape,
  // }),
  // z.object({
  //   itemType: z.literal('PERMIT'),
  //   ...itemMetadataSchemas.PERMIT.shape,
  // }),
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
