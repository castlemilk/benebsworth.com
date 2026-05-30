import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  images: { unoptimized: true },
  reactStrictMode: true,
}

const withMDX = createMDX({})
export default withMDX(nextConfig)
