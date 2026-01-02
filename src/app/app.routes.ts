import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'profile'
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.page').then((m) => m.ProfilePageComponent),
    title: 'Profile'
  },
  {
    path: 'view',
    loadComponent: () =>
      import('./pages/view/view.page').then((m) => m.ViewPageComponent),
    title: 'View'
  },
  {
    path: '**',
    redirectTo: 'profile'
  }
];


