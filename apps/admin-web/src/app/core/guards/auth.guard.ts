import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token) {
    return router.parseUrl('/login');
  }

  if (auth.profile()) {
    return true;
  }

  return auth.loadCurrentUser().pipe(
    map(() => true),
    catchError(() => of(router.parseUrl('/login'))),
  );
};
