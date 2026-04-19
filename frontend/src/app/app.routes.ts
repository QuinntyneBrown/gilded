import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup.component').then(m => m.SignupPageComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'search',
    loadComponent: () => import('./search/search.component').then(m => m.SearchPageComponent),
  },
  {
    path: 'reset-request',
    loadComponent: () => import('./reset-request/reset-request.component').then(m => m.ResetRequestPageComponent),
  },
  {
    path: 'reset-complete',
    loadComponent: () => import('./reset-complete/reset-complete.component').then(m => m.ResetCompletePageComponent),
  },
  {
    path: 'settings/spouse',
    loadComponent: () => import('./settings/spouse-settings.component').then(m => m.SpouseSettingsPageComponent),
  },
  {
    path: 'counsellors/:id',
    loadComponent: () => import('./counsellors/counsellor-profile.component').then(m => m.CounsellorProfilePageComponent),
  },
  {
    path: 'admin/counsellors/pending',
    loadComponent: () => import('./admin/moderation-queue.component').then(m => m.ModerationQueueComponent),
  },
];
