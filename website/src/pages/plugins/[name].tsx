import { Center, Spinner, Container, Grid, SimpleGrid, Box, Code } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useFetch } from 'use-http';
import { PluginWithStats } from '../api/plugins';
import tw, { styled } from 'twin.macro';
import React from 'react';
import { PackageInstall } from '../../components/packageInstall';
import { RemoteGHMarkdown } from '../../components/RemoteGhMarkdown';
import { format } from 'date-fns';

export const SubTitle = styled.h2(() => [tw`mt-0 mb-4 font-bold text-lg md:text-xl`]);
export const Title = styled.h2(() => [tw`mt-0 mb-4 font-bold text-xl md:text-2xl`]);

export default function PluginPage() {
  const router = useRouter();
  const queryKey = 'name';
  const pluginId = router.query[queryKey] || router.asPath.match(new RegExp(`[&?]${queryKey}=(.*)(&|$)`));
  const { loading, data = [] } = useFetch<PluginWithStats[]>(`/api/plugins?id=${pluginId}`, {}, [pluginId]);

  if (loading) {
    return (
      <Center h="300px">
        <Spinner size={'xl'} />
      </Center>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Center h="300px" flexDir={'column'}>
        <SubTitle>404</SubTitle>
        <div>Plugin not found.</div>
      </Center>
    );
  }

  const pluginData = data[0];

  return (
    <section>
      <Container p={'1.5rem'} maxWidth={1200}>
        <Title>
          <a href="/plugins">Plugin Hub</a> {'>'} {pluginData.title}
        </Title>
        <Grid templateColumns="1fr 350px" gap={4}>
          <Box>
            <PackageInstall packageName={pluginData.npmPackage} />
            <RemoteGHMarkdown
              directory={pluginData.stats.collected.metadata.repository?.directory}
              repo={pluginData.stats.collected.metadata.links.repository}
            >
              {pluginData.readme || pluginData.stats.collected.metadata.readme || ''}
            </RemoteGHMarkdown>
          </Box>
          <Box>
            <SubTitle>Plugin Details</SubTitle>
            <SimpleGrid columns={2}>
              <div>Identifier</div>
              <div>
                <Code>{pluginData.npmPackage}</Code>
              </div>
              <div>License</div>
              <div>
                <Code>{pluginData.stats.collected.metadata.license}</Code>
              </div>
              <div>Version</div>
              <div>
                <Code>{pluginData.stats.collected.metadata.version}</Code>
              </div>
              <div>Updated</div>
              <div>
                <Code>{format(new Date(pluginData.stats.collected.metadata.date), 'MMM do, yyyy')}</Code>
              </div>
              {pluginData.stats.collected.github?.starsCount ? (
                <>
                  <div>Stars</div>
                  <div>
                    <Code>{pluginData.stats.collected.github?.starsCount}</Code>
                  </div>
                </>
              ) : null}
            </SimpleGrid>
          </Box>
        </Grid>
      </Container>
    </section>
  );
}
