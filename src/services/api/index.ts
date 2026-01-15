/**
 * API Services - Clean abstraction over Supabase
 *
 * Usage:
 * import { getAmbassadors, createFiesta } from '@/services/api';
 */

export {
  getAmbassadors,
  createAmbassador,
  updateAmbassador,
  deleteAmbassador,
} from './ambassadors';

export {
  getFiestas,
  createFiesta,
  updateFiesta,
} from './fiestas';
