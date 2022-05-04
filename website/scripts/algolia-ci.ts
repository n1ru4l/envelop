import { indexToAlgolia } from '@guild-docs/algolia';
import { join } from 'node:path';

import { getRoutes } from '../routes';

indexToAlgolia({
  routes: [getRoutes()],
  source: 'Envelop',
  dryMode: !!process.env.ALGOLIA_DRY_RUN,
  lockfilePath: join(__dirname, '..', 'algolia-lockfile.txt'),
});
