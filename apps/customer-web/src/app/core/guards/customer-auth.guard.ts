import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CustomerSessionStore } from '../../state/session/customer-session.store';

export const customerAuthGuard: CanActivateFn = (_route, state) => {
  const session = inject(CustomerSessionStore);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
