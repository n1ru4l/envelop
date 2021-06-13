import React from 'react';
import ReactMarkdown, { uriTransformer } from 'react-markdown';
import { components } from '@guild-docs/client';
import { Code, useColorModeValue } from '@chakra-ui/react';

export const RemoteGHMarkdown: React.FC<{ children: string; repo?: string; directory?: string }> = ({
  children,
  repo,
  directory,
}) => {
  return (
    <ReactMarkdown
      components={{
        ...components,
        pre: props => <div {...props} />,
        code: ({ inline, ...props }) => {
          const colorScheme = useColorModeValue('blackAlpha', undefined);

          return inline ? (
            <Code {...props} margin="1px" colorScheme={colorScheme} fontWeight="semibold" fontSize="0.9em" borderRadius={'sm'} />
          ) : (
            <Code
              fontSize="0.9rem"
              {...props}
              colorScheme={colorScheme}
              padding={'20px !important'}
              width={'100%'}
              borderRadius={'sm'}
            />
          );
        },
      }}
      linkTarget="_blank"
      transformImageUri={src => {
        const initial = uriTransformer(src);

        if (repo) {
          let modified = repo.replace('https://github.com/', 'https://raw.githubusercontent.com/') + '/HEAD/';

          if (directory) {
            modified = modified + directory;
          }

          return modified + (initial.startsWith('.') ? initial.substr(1) : initial);
        }

        return initial;
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
