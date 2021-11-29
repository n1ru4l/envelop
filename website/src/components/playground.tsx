import React from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Demo } from '../lib/demos';
import { Box, Grid } from '@chakra-ui/layout';

export const canUseDOM = typeof window !== 'undefined';

export const Playground: React.FC<{ demo: Demo }> = ({ demo }) => {
  const [code, setCode] = React.useState(demo.code);
  const [schema, setSchema] = React.useState(demo.schema);
  const [operation, setOperation] = React.useState(demo.query);

  if (!canUseDOM) {
    return null;
  }

  return (
    <Grid templateColumns={['1fr', '1fr', '1fr 350px']} gap={4}>
      <Box>
        <MonacoEditor
          height="40vh"
          language={'typescript'}
          theme={'vs'}
          value={code}
          onChange={e => e && setSchema(e)}
          options={{
            readOnly: false,
            minimap: {
              enabled: false,
            },
          }}
        />
      </Box>
    </Grid>
  );
};
