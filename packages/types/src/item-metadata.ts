import { z } from 'zod';

<<<<<<< HEAD
// Base properties all items share
=======
>>>>>>> feat/evaluator
const baseMetadataSchema = z.object({
  description: z.string(),
});

<<<<<<< HEAD
// Digital item specific properties
=======
>>>>>>> feat/evaluator
const digitalMetadataSchema = baseMetadataSchema.extend({
  url: z.string().url(),
});

<<<<<<< HEAD
// Physical item specific properties
=======
>>>>>>> feat/evaluator
const physicalMetadataSchema = baseMetadataSchema.extend({
  origin: z.string(),
});

<<<<<<< HEAD
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

=======
export const itemMetadataSchemas = {
>>>>>>> feat/evaluator
  PHYSICAL: physicalMetadataSchema,
  DIGITAL: digitalMetadataSchema,
};

// Combined schema that validates based on item type
export const itemMetadataSchema = z.discriminatedUnion('itemType', [
<<<<<<< HEAD
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
=======
>>>>>>> feat/evaluator
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
