import { z } from 'zod';

const reportCategory = z.enum(['Sales', 'Inventory', 'Finance', 'GST']);
const reportPeriod = z.enum([
  'today',
  'last_7_days',
  'current_month',
  'previous_month',
  'financial_year',
]);
const reportFormat = z.enum(['CSV', 'Excel', 'PDF']);

export const reportQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  category: z.enum(['all', 'Sales', 'Inventory', 'Finance', 'GST']).optional().default('all'),
  status: z.enum(['all', 'Ready', 'Draft', 'Failed', 'Archived']).optional().default('all'),
  period: z
    .enum(['all', ...reportPeriod.options])
    .optional()
    .default('current_month'),
  sort: z.enum(['newest', 'oldest', 'records_desc', 'records_asc']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
});

export const createReportRunSchema = z.object({
  reportName: z.string().trim().min(2),
  category: reportCategory,
  period: reportPeriod,
  formats: z.array(reportFormat).min(1).optional().default(['CSV']),
  notes: z.string().trim().optional().or(z.literal('')),
});

export const updateReportRunSchema = createReportRunSchema.partial().extend({
  status: z.enum(['Ready', 'Draft', 'Failed', 'Archived']).optional(),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type CreateReportRunInput = z.infer<typeof createReportRunSchema>;
export type UpdateReportRunInput = z.infer<typeof updateReportRunSchema>;
