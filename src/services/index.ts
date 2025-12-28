/**
 * Service layer for Supabase operations
 *
 * This layer abstracts database operations from hooks and components,
 * providing a clean API for data access with consistent error handling.
 *
 * Usage:
 * import { ambassadorService, fiestaService } from '@/services';
 *
 * const ambassadors = await ambassadorService.getAll(organizationId);
 */

export * from './base';
export * from './ambassadors';
export * from './fiestas';
export * from './organizations';
export * from './notifications';
export * from './mentions';
