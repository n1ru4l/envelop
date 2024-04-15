/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: process.env.SITE_URL || 'https://the-guild.dev/graphql/envelop',
  generateIndexSitemap: false,
  output: 'export',
};