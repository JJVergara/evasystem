/**
 * API Services - Clean abstraction over Supabase
 *
 * Usage:
 * import { getAmbassadors, createFiesta, getTasks } from '@/services/api';
 */

// Ambassador services
export {
  getAmbassadors,
  createAmbassador,
  updateAmbassador,
  deleteAmbassador,
} from './ambassadors';

// Fiesta services
export { getFiestas, createFiesta, updateFiesta } from './fiestas';

// Event services
export { getEvents, getEventsByFiesta, createEvent, updateEvent, deleteEvent } from './events';

// Task services
export {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  type TaskType,
  type TaskStatusType,
  type TaskWithRelations,
  type TaskStats,
  type TasksData,
  type CreateTaskInput,
  type UpdateTaskInput,
} from './tasks';
