import React from 'react';
import ReactMarkdown from 'react-markdown';
import { components } from '@guild-docs/client';
import { chakra } from '@chakra-ui/system';

export const Markdown: React.FC<{ children: string }> = ({ children }) => {
  return (
    <ReactMarkdown
      linkTarget="_blank"
      components={{
        ...components,
        a: chakra('a', {
          baseStyle: {
            display: 'inline-block !important',
            color: '#2f77c9',
            _hover: {
              textDecoration: 'underline',
            },
          },
        }),
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
