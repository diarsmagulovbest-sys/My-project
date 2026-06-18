export type SidebarPage =
  | 'today'
  | 'goals'
  | 'roadmap'
  | 'tasks'
  | 'progress'
  | 'mentor'
  | 'achievements'
  | 'settings';

export type AppPage = SidebarPage | 'create' | 'detail' | 'secret';

export type DetailSectionId = 'summary' | 'mentor' | 'roadmap' | 'tasks' | 'progress';

export type AppNavTarget = {
  page: SidebarPage | 'create';
};
