export default async () => {
  const { PLUGINS } = await import('../../lib/plugins');
  return Object.fromEntries(
    PLUGINS.map(({ identifier, title }) => [
      identifier,
      {
        title,
        theme: {
          layout: 'default', // todo: remove this when nextra will be updated
          timestamp: false,
        },
      },
    ]),
  );
};
