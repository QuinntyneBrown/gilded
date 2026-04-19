import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup.component').then(m => m.SignupPageComponent),
  },
];
