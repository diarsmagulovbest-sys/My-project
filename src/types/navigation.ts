export type SidebarPage =
  | 'today'
  | 'goals'
  | 'roadmap'
  | 'tasks'
  | 'progress'
  | 'achievements'
  | 'settings';

export type AppPage = SidebarPage | 'create' | 'customize' | 'detail' | 'secret';

export type DetailSectionId = 'summary' | 'roadmap' | 'tasks' | 'progress';

export type AppNavTarget = {
  page: SidebarPage | 'create';
};
