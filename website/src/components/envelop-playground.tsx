import * as React from 'react';
import { Text, Textarea, Button } from '@chakra-ui/react';
import Editor from '@monaco-editor/react';
import { useDebounceCallback } from '../lib/hooks/use-debounce-callback';

const envelopBase = /* TypeScript */ `
import { envelop, useSchema } from "@envelop/core";
import { schema } from "./schema";

const getEnveloped = envelop({
 plugins: [useSchema(schema)],
 enableInternalTracing: false,
});

export { getEnveloped }
`;

type PlaygroundStateBundling = {
  type: 'bundling';
};

type PlaygroundStateBundleError = {
  type: 'bundle-error';
  message: string;
};

type PlaygroundStateRunning = {
  type: 'running';
};

type PlaygroundStateRunError = {
  type: 'run-error';
  message: string;
};

type PlaygroundState = PlaygroundStateBundling | PlaygroundStateBundleError | PlaygroundStateRunning | PlaygroundStateRunError;

export const EnvelopPlayground = () => {
  const [document, setDocument] = React.useState('query { __typename }');
  const [result, setResult] = React.useState('');
  const bundlingIdRef = React.useRef(0);
  const [playgroundState, setPlaygroundState] = React.useState<PlaygroundState>({
    type: 'bundling',
  });

  const updateCode = useDebounceCallback((code: string) => {
    bundlingIdRef.current++;
    workerRef.current?.postMessage({ id: bundlingIdRef.current, type: 'code', code });
    setPlaygroundState({
      type: 'bundling',
    });
  }, 300);

  const workerRef = React.useRef<Worker | null>(null);
  React.useEffect(() => {
    // @ts-ignore
    workerRef.current = new Worker(new URL('../lib/worker.ts', import.meta.url));
    workerRef.current.onmessage = evt => {
      if (evt.data.type === 'execute-result') {
        setResult(JSON.stringify(JSON.parse(evt.data.result), null, 2));
      }

      if (evt.data.id !== bundlingIdRef.current) {
        return;
      }

      if (evt.data.type === 'code-success') {
        setPlaygroundState({
          type: 'running',
        });
      }
      if (evt.data.type === 'code-error') {
        setPlaygroundState({
          type: 'bundle-error',
          message: evt.data.errors.join('\n'),
        });
      }
      if (evt.data.type === 'run-error') {
        setPlaygroundState({
          type: 'run-error',
          message: evt.data.message,
        });
      }
    };
    updateCode(envelopBase);

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <>
      <Text mb="8px" fontWeight="bold">
        Envelop code
      </Text>
      <Editor
        height="500px"
        defaultLanguage="javascript"
        defaultValue={envelopBase}
        defaultPath="file:///getEnveloped.js"
        onChange={code => {
          if (code) {
            updateCode(code);
          }
        }}
        options={{
          glyphMargin: false,
          folding: false,
          lineNumbers: 'off',
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          minimap: {
            enabled: false,
          },
        }}
      />
      {playgroundState.type === 'bundling' ? 'Bundling' : null}
      {playgroundState.type === 'bundle-error' ? 'Error while bundling' : null}
      {playgroundState.type === 'running' ? 'Running' : null}
      {playgroundState.type === 'run-error' ? 'Error while running' : null}

      <Text mb="8px">Document</Text>
      <Textarea value={document} onChange={ev => setDocument(ev.target.value)} />
      <Button
        onClick={() => {
          if (playgroundState.type !== 'running') {
            return;
          }
          workerRef.current?.postMessage({ id: '1', type: 'execute', payload: { query: document } });
        }}
        disabled={playgroundState.type !== 'running'}
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
