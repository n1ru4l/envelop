import React from 'react';
import { NextRouter } from 'next/router';

export const handleRoute = (path: string, e: React.MouseEvent, router: NextRouter): void => {
  e.preventDefault();
  if (!path) {
    return;
  }

  router.push(path);
};
