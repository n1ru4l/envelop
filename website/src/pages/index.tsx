import Head from 'next/head';
import { useRouter } from 'next/router';
import { FeatureList, HeroGradient, HeroIllustration, HeroMarketplace, InfoList } from '@theguild/components';
import { handleRoute } from '../../next-helpers';

export default function Index() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Envelop</title>
      </Head>
      <HeroGradient
        title="A GraphQL plugin system for improved developer experience"
        description="Use any NodeJS server framework and any GraphQL schema, with a simple, sharable plugins system ."
        link={{
          href: '/docs',
          children: 'Get Started',
          title: 'Learn more about GraphQL Envelop',
          onClick: e => handleRoute('/docs', e, router),
        }}
        version="1.0.7"
        colors={['#FF34AE', '#1CC8EE']}
        image={{
          src: '/assets/home-claw.png',
          alt: 'Illustration',
        }}
      />
      <FeatureList
        title="What's Envelop?"
        items={[
          {
            image: {
              alt: 'Pluggable',
              src: '/assets/features-pluggable.png',
            },
            title: 'Pluggable',
            description: 'Powerful plugin system that wraps the entire GraphQL execution pipeline.',
          },
          {
            image: {
              alt: 'Flexible',
              src: '/assets/features-modern.png',
            },
            title: 'Flexible',
            description: 'Use with any HTTP server, and any GraphQL schema libraries (code-first / schema-first).',
          },
          {
            image: {
              alt: 'Develop Faster',
              src: '/assets/features-performant.png',
            },
            title: 'Develop Faster',
            description: `You don't have to reinvent the wheel for every feature. You can write/use Envelop plugin for most workflows.`,
          },
        ]}
      />
      {/* <HeroVideo
        title="Easy Installation"
        description=""
        link={{
          href: '/docs',
          children: 'Documentation',
          title: 'Read the documentation',
          onClick: e => handleRoute('/docs', e, router),
        }}
        video={{
          src: '//',
          placeholder: '/assets/video-placeholder.png',
        }}
        flipped
      /> */}
      <HeroIllustration
        title="How it works?"
        description="Envelop providers a low-level plugin API (based on hooks) for plugins developers. By combining plugins, you can create your own GraphQL 'framework', and get a modified version of GraphQL with the capabilities you need."
        image={{
          src: '/assets/home-communication.png',
          alt: 'Illustration',
        }}
        flipped
      />
      <HeroMarketplace
        title="Plugins Hub"
        description="Find, explore, try and test plugins for Envelop."
        link={{
          href: '/plugins',
          children: 'Explore plugins',
          title: 'Learn more about the Plugins Hub',
          onClick: e => handleRoute('/plugins', e, router),
        }}
      />
      <InfoList
        title="Get Started"
        items={[
          {
            title: 'The envelop approach',
            description: '',
            link: {
              href: '/docs',
              children: 'Documentation',
              title: 'Read the documentation',
              onClick: e => handleRoute('/docs', e, router),
            },
          },
          // {
          //   title: 'Github integration',
          //   description: '',
          //   link: {
          //     href: 'https://github.com/dotansimha/envelop/',
          //     children: 'Github',
          //     target: '_blank',
          //     rel: 'noopener noreferrer',
          //     title: 'View the code',
          //   },
          // },
          // {
          //   title: "Let's work together",
          //   description: 'We want to hear from you, our community of fellow engineers.',
          //   link: {
          //     href: 'mailto:envelop@theguild.dev',
          //     children: 'envelop@theguild.dev',
          //     title: 'Reach us out',
          //   },
          // },
        ]}
      />
    </>
  );
}
