import { format } from 'date-fns';
import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import React from 'react';
import tw, { styled } from 'twin.macro';
import { Box, Center, Code, Container, Grid, SimpleGrid } from '@chakra-ui/react';
import { EditOnGitHubButton, PackageInstall, RemoteGHMarkdown } from '@guild-docs/client';
import { buildMDX, CompiledMDX } from '@guild-docs/server';
import { getPackagesData, PackageInfo, PackageWithStats } from '@guild-docs/server/npm';

import { pluginsArr as packageList } from '../../lib/plugins';
import Head from 'next/head';

export const SubTitle = styled.h2(() => [tw`mt-0 mb-4 font-bold text-lg md:text-xl`]);
export const Title = styled.h2(() => [tw`mt-0 mb-4 font-bold text-xl md:text-2xl`]);

const StyledLink = styled.a(() => [tw`cursor-pointer`]);
const CodeLink = styled(Code)(() => [tw`hover:font-bold`]);

interface PluginPageProps {
  data: (PackageWithStats & { mdx: CompiledMDX })[];
}

type PluginPageParams = {
  name: string;
};

export const getStaticProps: GetStaticProps<PluginPageProps, PluginPageParams> = async ctx => {
  const pluginName = ctx.params?.name;

  const pluginsData =
    typeof pluginName === 'string'
      ? await getPackagesData({
          idSpecific: pluginName,
          packageList,
        })
      : [];

  const data = await Promise.all(
    pluginsData.map(async plugin => {
      return {
        ...plugin,
        mdx: await buildMDX(plugin.readme || plugin.stats?.readme || ''),
      };
    })
  );

  return {
    props: {
      data,
    },
    // Revalidate at most once every 1 hour
    revalidate: 60 * 60,
  };
};

export const getStaticPaths: GetStaticPaths<PluginPageParams> = async () => {
  const plugins = await getPackagesData({
    packageList,
  });

  return {
    fallback: 'blocking',
    paths: plugins.map(({ identifier }) => {
      return {
        params: {
          name: identifier,
        },
      };
    }),
  };
};

export default function PluginPageContent({ data }: PluginPageProps) {
  if (!data.length) {
    return (
      <Center h="300px" flexDir={'column'}>
        <SubTitle>404</SubTitle>
        <div>Plugin not found.</div>
      </Center>
    );
  }

  const pluginData = data[0];

  const description = pluginData.stats?.description ? pluginData.stats.description : null;
  const title = `${pluginData.title} | Envelop Plugin Hub`;

  const repoInfo = extractRepositoryInformation(pluginData.stats);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="og:title" content={title} />
        <meta name="twitter:title" content={title} />
        {description && (
          <>
            <meta name="twitter:description" content={description} />
            <meta name="og:description" content={description} />
            <meta name="description" content={description} />
          </>
        )}
      </Head>
      <section>
        <Container p={'1.5rem'} maxWidth={1200}>
          <Title>
            <Link href="/plugins" passHref>
              <a>Plugin Hub</a>
            </Link>
            {' >'} {pluginData.title}
          </Title>
          <Grid templateColumns={['1fr', '1fr', '1fr 350px']} gap={4}>
            <Box>
              <PackageInstall packages={pluginData.npmPackage} />
              <RemoteGHMarkdown
                directory={pluginData.stats?.repositoryDirectory}
                repo={pluginData.stats?.repositoryLink}
                content={pluginData.mdx}
              />
            </Box>
            <Box gridRow={['1', '1', 'auto']}>
              <SubTitle>Plugin Details</SubTitle>
              <SimpleGrid columns={2}>
                <div>Package</div>
                <div>
                  <StyledLink href={`https://www.npmjs.com/package/${pluginData.npmPackage}`}>
                    <CodeLink as="span">{pluginData.npmPackage}</CodeLink>
                  </StyledLink>
                </div>
                {pluginData.stats?.license ? (
                  <>
                    <div>License</div>
                    <div>
                      <Code>{pluginData.stats.license}</Code>
                    </div>
                  </>
                ) : null}
                {pluginData.stats?.version ? (
                  <>
                    <div>Version</div>
                    <div>
                      <Code>{pluginData.stats.version}</Code>
                    </div>
                  </>
                ) : null}
                {pluginData.stats?.modifiedDate ? (
                  <>
                    <div>Updated</div>
                    <div>
                      <Code>{format(new Date(pluginData.stats.modifiedDate), 'MMM do, yyyy')}</Code>
                    </div>
                  </>
                ) : null}
              </SimpleGrid>
              {repoInfo ? (
                <EditOnGitHubButton
                  repo={repoInfo.repo}
                  branch={repoInfo.branch}
                  baseDir={repoInfo.baseDir}
                  sourceFilePath={repoInfo.sourceFilePath}
                />
              ) : null}
            </Box>
          </Grid>
        </Container>
      </section>
    </>
  );
}

/**
 * TODO: document how people can configure their yoga plugin package.json so it properly processed.
 */
function extractRepositoryInformation(stats: PackageInfo | null | undefined) {
  if (stats?.repository == null || typeof stats.repository !== 'object' || !stats.repository.directory || !stats.repository.url) {
    return null;
  }

  const parseRepoURLRegex = /git\+https:\/\/github\.com\/([A-Za-z0-9-]+\/[A-Za-z0-9-]+)\.git/;
  const result = stats.repository.url.match(parseRepoURLRegex);

  if (result === null) {
    return null;
  }

  const [, repo] = result;

  return {
    repo,
    baseDir: stats.repository.directory,
    /** TODO: this should probably be more flexible. */
    sourceFilePath: 'README.md',
    /** TODO: this should probably be more flexible. */
    branch: 'main',
  };
}
