import * as React from 'react';
import { Text, Button, Grid, GridItem, Container, Heading, VStack, Box, Center, Flex, Spacer } from '@chakra-ui/react';
import Editor from '@monaco-editor/react';
import type monaco from 'monaco-editor';
import { useDebounceCallback } from '../lib/hooks/use-debounce-callback';

const envelopBase = /* TypeScript */ `// Customize the envelop setup here
import { envelop, useSchema } from "@envelop/core";
import { schema } from "./schema";

const getEnveloped = envelop({
 plugins: [useSchema(schema)],
 enableInternalTracing: false,
});

export { getEnveloped }
`;

const initialDocument = `query {\n  __typename\n}\n`;

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

const monacoOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  glyphMargin: false,
  folding: false,
  lineNumbers: 'off',
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  minimap: {
    enabled: false,
  },
};

export const EnvelopPlayground = () => {
  const [document, setDocument] = React.useState(initialDocument);
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
    <Container p={'1.5rem'} maxWidth={1400}>
      <VStack align="stretch">
        <Heading>Envelop Playground</Heading>
        <Text></Text>
        <Grid templateRows="repeat(2, 1fr)" templateColumns="repeat(2, 1fr)" gap={4}>
          <GridItem rowSpan={1} colSpan={1}>
            <Text mb="8px" fontWeight="bold">
              GraphQL Operation
            </Text>
            <Editor
              height="450px"
              defaultLanguage="graphql"
              defaultValue={document}
              defaultPath="file:///graphql.graphql"
              onChange={document => {
                if (document) {
                  setDocument(document);
                }
              }}
              options={monacoOptions}
            />
            <Flex marginTop="1rem">
              <Center>
                <Text mb="8px">
                  <Box as="span" fontWeight="bold">
                    Server Status:{' '}
                  </Box>
                  {playgroundState.type === 'bundling' ? 'Bundling' : null}
                  {playgroundState.type === 'bundle-error' ? 'Error while bundling' : null}
                  {playgroundState.type === 'running' ? 'Running' : null}
                  {playgroundState.type === 'run-error' ? 'Error while running' : null}
                </Text>
              </Center>
              <Spacer />
              <Center>
                <Button
                  colorScheme="pink"
                  display="block"
                  onClick={() => {
                    if (playgroundState.type !== 'running') {
                      return;
                    }
                    workerRef.current?.postMessage({ id: '1', type: 'execute', payload: { query: document } });
                  }}
                  disabled={playgroundState.type !== 'running'}
                >
                  Execute Operation
                </Button>
              </Center>
            </Flex>
          </GridItem>
          <GridItem colSpan={1} rowSpan={1}>
            <Text mb="8px" fontWeight="bold">
              Execution Result
            </Text>
            <Editor
              height="500px"
              defaultLanguage="json"
              value={result}
              defaultPath="file:///result.json"
              options={{
                ...monacoOptions,
                readOnly: true,
              }}
            />
          </GridItem>
          <GridItem rowSpan={1} colSpan={1}>
            <Text mb="8px" fontWeight="bold">
              Code
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
              options={monacoOptions}
            />
          </GridItem>
          <GridItem colSpan={1} rowSpan={1}>
            <Text mb="8px" fontWeight="bold">
              Status
            </Text>
            <Editor
              height="500px"
              value={'message' in playgroundState ? playgroundState.message : 'All Good'}
              defaultPath="file:///error.log"
              options={{
                ...monacoOptions,
                readOnly: true,
              }}
            />
          </GridItem>
        </Grid>
      </VStack>
    </Container>
  );
};
