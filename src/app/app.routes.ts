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
      import('./components/profile/profile.component').then((m) => m.ProfilePageComponent),
    title: 'Profile'
  },
  {
    path: 'view',
    loadComponent: () =>
      import('./components/view/view.component').then((m) => m.ViewComponent),
    title: 'View'
  },
  {
    path: '**',
    redirectTo: 'profile'
  }
];


