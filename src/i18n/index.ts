import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  es: {
    common: {
      // Navigation
      dashboard: 'Dashboard',
      stories: 'Historias',
      mentions: 'Menciones',
      storyMentions: 'Menciones Historias',
      analytics: 'Analíticas',
      events: 'Fiestas',
      ambassadors: 'Embajadores',
      profile: 'Mi Perfil',
      settings: 'Configuraciones',
      notifications: 'Notificaciones',
      importExport: 'Import/Export',
      
      // Common actions
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      view: 'Ver',
      add: 'Agregar',
      create: 'Crear',
      update: 'Actualizar',
      search: 'Buscar',
      filter: 'Filtrar',
      export: 'Exportar',
      import: 'Importar',
      
      // Status
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente',
      completed: 'Completado',
      progress: 'En progreso',
      
      // Common phrases
      loading: 'Cargando...',
      noData: 'No hay datos disponibles',
      error: 'Ocurrió un error',
      success: 'Operación exitosa',
      
      // Fiesta/Event related
      selectEvent: 'Seleccionar Fiesta',
      noEventSelected: 'No hay fiesta seleccionada',
      allEvents: 'Todas las Fiestas',
    }
  },
  en: {
    common: {
      // Navigation
      dashboard: 'Dashboard',
      stories: 'Stories',
      mentions: 'Mentions',
      storyMentions: 'Story Mentions',
      analytics: 'Analytics',
      events: 'Events',
      ambassadors: 'Ambassadors',
      profile: 'My Profile',
      settings: 'Settings',
      notifications: 'Notifications',
      importExport: 'Import/Export',
      
      // Common actions
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      add: 'Add',
      create: 'Create',
      update: 'Update',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      
      // Status
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      completed: 'Completed',
      progress: 'In Progress',
      
      // Common phrases
      loading: 'Loading...',
      noData: 'No data available',
      error: 'An error occurred',
      success: 'Operation successful',
      
      // Fiesta/Event related
      selectEvent: 'Select Event',
      noEventSelected: 'No event selected',
      allEvents: 'All Events',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('eva-language') || 'es', // Default to Spanish
    fallbackLng: 'es',
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    react: {
      useSuspense: false, // Disable suspense to avoid loading issues
    }
  });

export default i18n;