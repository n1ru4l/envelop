import * as React from 'react';
import { Text, Textarea, Button } from '@chakra-ui/react';

const envelopBase = () => /* TypeScript */ `
import { envelop, useSchema } from "@envelop/core";
import { schema } from "./schema";

const getEnveloped = envelop({
 plugins: [useSchema(schema)],
 enableInternalTracing: false,
});

export { getEnveloped }
`;

export const EnvelopPlayground = () => {
  const [envelopCode, setEnvelopCode] = React.useState(envelopBase);
  const [document, setDocument] = React.useState('query { __typename }');
  const [result, setResult] = React.useState('');

  const workerRef = React.useRef<Worker | null>(null);
  React.useEffect(() => {
    // @ts-ignore
    workerRef.current = new Worker(new URL('../lib/worker.ts', import.meta.url));
    workerRef.current.onmessage = evt => {
      console.log(evt.data);
      if (evt.data.type === 'execute-result') {
        setResult(JSON.stringify(JSON.parse(evt.data.result), null, 2));
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  React.useEffect(() => {}, [envelopCode]);

  return (
    <>
      <Text mb="8px">Envelop code</Text>
      <Textarea value={envelopCode} onChange={ev => setEnvelopCode(ev.target.value)} />
      <Button onClick={() => workerRef.current?.postMessage({ id: '1', type: 'code', code: envelopCode })}>Bundle</Button>
      <Text mb="8px">Document</Text>
      <Textarea value={document} onChange={ev => setDocument(ev.target.value)} />
      <Button
        onClick={() => {
          workerRef.current?.postMessage({ id: '1', type: 'execute', payload: { query: document } });
        }}
      >
        Execute
      </Button>
      <Text>Result</Text>
      <pre>
        <code>{result}</code>
      </pre>
    </>
  );
};
