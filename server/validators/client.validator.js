import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const optionalDateSchema = z.union([z.string().datetime().optional(), z.string().date().optional(), z.null()]).optional();
const looseRowSchema = z.object({}).passthrough();

export const clientIdParamsSchema = z.object({
    body: z.any().optional(),
    query: z.any().optional(),
    params: z.object({
        clientId: objectIdSchema
    })
});

export const createClientSchema = z.object({
    params: z.object({}).optional(),
    query: z.object({}).optional(),
    body: z.object({
        clientName: z.string().min(1).optional(),
        tradeName: z.string().min(1).optional(),
        entityType: z.string().min(1),
        wasteType: z.string().min(1).optional(),
        category: z.string().optional()
    }).passthrough()
});

export const assignClientSchema = z.object({
    params: z.object({
        clientId: objectIdSchema
    }),
    query: z.object({}).optional(),
    body: z.object({
        assignedTo: objectIdSchema.optional().nullable(),
        assignedManager: objectIdSchema.optional().nullable()
    }).refine((value) => value.assignedTo || value.assignedManager, {
        message: 'assignedTo or assignedManager is required'
    })
});

export const validateClientStatusSchema = z.object({
    params: z.object({
        clientId: objectIdSchema
    }),
    query: z.object({}).optional(),
    body: z.object({
        validationStatus: z.string().min(1),
        validationRemarks: z.string().optional(),
        remarks: z.string().optional()
    }).passthrough()
});

export const plantProcessProgressSchema = z.object({
    params: z.object({
        clientId: objectIdSchema
    }),
    query: z.object({}).optional(),
    body: z.object({
        type: z.enum(['CTE', 'CTO']),
        itemId: objectIdSchema,
        completedSteps: z.array(z.string()).min(1)
    })
});

export const productComplianceSaveSchema = z.object({
    params: z.object({
        clientId: objectIdSchema
    }),
    query: z.object({}).optional(),
    body: z.object({
        type: z.enum(['CTE', 'CTO']),
        itemId: objectIdSchema,
        plantName: z.string().optional(),
        rows: z.array(looseRowSchema).optional(),
        componentDetails: z.array(looseRowSchema).optional(),
        supplierCompliance: z.array(looseRowSchema).optional(),
        supplierCtoChecks: z.array(looseRowSchema).optional(),
        recycledQuantityUsed: z.array(looseRowSchema).optional(),
        procurementDetails: z.array(looseRowSchema).optional(),
        history: z.array(looseRowSchema).optional()
    }).passthrough()
});

export const supplierCtoChecksSchema = z.object({
    params: z.object({
        clientId: objectIdSchema
    }),
    query: z.object({}).optional(),
    body: z.object({
        type: z.enum(['CTE', 'CTO']),
        itemId: objectIdSchema,
        rows: z.array(z.object({
            supplierName: z.string().min(1),
            registrationStatus: z.enum(['', 'Approved', 'In Progress', 'Pending']).optional(),
            ctoAvailability: z.string().optional(),
            ctoPlantNo: z.string().optional(),
            ctoPlantName: z.string().optional(),
            ctoStartDate: optionalDateSchema,
            ctoValidUpto: optionalDateSchema,
            ctoCcaDocument: z.string().optional()
        }).passthrough()).optional()
    }).passthrough()
});

export const paginationQuerySchema = z.object({
    params: z.object({}).optional(),
    body: z.any().optional(),
    query: z.object({
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        search: z.string().optional(),
        validationStatus: z.string().optional()
    }).passthrough()
});

export const historyImportSchema = z.object({
    params: z.object({
        clientId: objectIdSchema
    }),
    query: z.object({}).optional(),
    body: z.object({
        type: z.enum(['CTE', 'CTO']),
        itemId: objectIdSchema,
        history: z.array(looseRowSchema)
    })
});
