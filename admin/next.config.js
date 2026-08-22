/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const repositoryName = "tukang-app";

/**
 * GitHub Pages serves project sites below /<repository>.
 * Keep local and other hosting deployments at the domain root.
 */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isGitHubPages ? `/${repositoryName}` : "",
  assetPrefix: isGitHubPages ? `/${repositoryName}/` : "",
};

module.exports = nextConfig;
