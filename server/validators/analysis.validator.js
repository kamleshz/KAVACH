import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const looseRowSchema = z.object({}).passthrough();

export const clientIdOnlySchema = z.object({
    body: z.any().optional(),
    query: z.any().optional(),
    params: z.object({
        clientId: objectIdSchema
    })
});

export const salesAnalysisSchema = z.object({
    params: z.object({}).optional(),
    query: z.object({}).optional(),
    body: z.object({
        clientId: objectIdSchema,
        type: z.string().min(1).optional(),
        rows: z.array(looseRowSchema).optional()
    }).passthrough()
});

export const plasticPrePostUploadSchema = z.object({
    params: z.object({}).optional(),
    query: z.object({}).optional(),
    body: z.object({
        clientId: objectIdSchema.optional(),
        type: z.string().min(1).optional()
    }).passthrough()
});

export const purchaseAnalysisSchema = z.object({
    params: z.object({}).optional(),
    query: z.object({}).optional(),
    body: z.object({
        clientId: objectIdSchema,
        type: z.string().min(1).optional(),
        rows: z.array(looseRowSchema).optional()
    }).passthrough()
});
