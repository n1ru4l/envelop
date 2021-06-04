import autocannon from 'autocannon';
import { writeFile } from 'fs/promises';
import mkdirp from 'mkdirp';
import { resolve } from 'path';
import { requireEnv } from 'require-env-variable';

const { TITLE, SUBTITLE, PORT } = requireEnv('TITLE', 'SUBTITLE', 'PORT');

const instance = autocannon(
  {
    url: `http://localhost:${PORT}/graphql`,
    connections: 10,
    duration: 5,
    title: `${TITLE}_${SUBTITLE}`,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: '{"query":"{authors{id name md5 books{ id name }}}"}',
  },
  async (err, result) => {
    if (err) console.error(err);

    await mkdirp('raw_results');
    const fileName = resolve('raw_results/' + result.title + '.json');

    writeFile(fileName, JSON.stringify(result, null, 2), {
      encoding: 'utf-8',
    })
      .then(() => {
        console.log('Result written to: ' + fileName);
      })
      .catch(console.error);
  }
);

process.once('SIGINT', () => {
  //@ts-expect-error
  instance.stop();
});

autocannon.track(instance, { renderProgressBar: true });
