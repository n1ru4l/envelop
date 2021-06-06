import { request } from 'graphql-request';
import { useQuery } from 'react-query';

import { HelloDocument, HelloQuery } from '../envelop.generated';

export default function Index() {
  const { data, isLoading } = useQuery('hello', async () => {
    const { hello } = await request<HelloQuery>('/api/graphql', HelloDocument);

    return hello;
  });

  if (isLoading) return <p>Loading...</p>;
  return <p>{data}</p>;
}
