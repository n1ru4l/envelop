import Head from 'next/head';
import { useRouter } from 'next/router';
import { FeatureList, HeroGradient, HeroIllustration, HeroMarketplace, HeroVideo, InfoList } from '@guild-docs/tgc';

import { handleRoute } from '../../next-helpers';

export default function Index() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Envelop</title>
      </Head>
      <HeroGradient
        title="A GraphQL server framework for improved developer experience"
        description="Use any Node framework and any GraphQL feature, with the easiest plugins system - A new framework by The Guild"
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
        title="The best and simple features"
        items={[
          {
            image: {
              alt: 'Toy Brick Icon',
              src: '/assets/features-pluggable.png',
            },
            title: 'Pluggable',
            description: 'Powerful plugin system',
          },
          {
            image: {
              alt: 'Gauge Icon',
              src: '/assets/features-performant.png',
            },
            title: 'Performant',
            description: 'Use any Node framework, use any execution',
          },
          {
            image: {
              alt: 'Toy Brick Icon',
              src: '/assets/features-modern.png',
            },
            title: 'Modern',
            description: 'Use all the latest GraphQL Capabilities',
          },
        ]}
      />
      <HeroVideo
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
      />
      <HeroIllustration
        title="Direct communication with your server"
        description=""
        image={{
          src: '/assets/home-communication.png',
          alt: 'Illustration',
        }}
        flipped
      />
      <HeroMarketplace
        title="Marketplace"
        description=""
        link={{
          href: '/marketplace',
          children: 'Get Started',
          title: 'Learn more about the Marketplace',
          onClick: e => handleRoute('/marketplace', e, router),
        }}
      />
      <InfoList
        title="Get Started"
        items={[
          {
            title: 'Install GraphQL Envelop',
            description: '',
            link: {
              href: '/docs',
              children: 'Documentation',
              title: 'Read the documentation',
              onClick: e => handleRoute('/docs', e, router),
            },
          },
          {
            title: 'Github integration',
            description: '',
            link: {
              href: 'https://github.com/dotansimha/envelop/',
              children: 'Github',
              target: '_blank',
              rel: 'noopener noreferrer',
              title: 'View the code',
            },
          },
          {
            title: "Let's work together",
            description: 'We want to hear from you, our community of fellow engineers.',
            link: {
              href: 'mailto:envelop@theguild.dev',
              children: 'envelop@theguild.dev',
              title: 'Reach us out',
            },
          },
        ]}
      />
    </>
  );
}
