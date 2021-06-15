import React from 'react';
import ReactMarkdown from 'react-markdown';
import { components } from '@guild-docs/client';
import { chakra } from '@chakra-ui/system';

const MD_COMPONENTS = {
  ...components,
  a: chakra('a', {
    baseStyle: {
      display: 'inline',
      color: '#2f77c9',
      _hover: {
        textDecoration: 'underline',
      },
    },
  }),
};

export const Markdown: React.FC<{ children: string }> = ({ children }) => {
  return (
    <ReactMarkdown linkTarget="_blank" components={MD_COMPONENTS}>
      {children}
    </ReactMarkdown>
  );
};
