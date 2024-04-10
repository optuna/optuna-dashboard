import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite")
    return mergeConfig(config, {
      server: {
        fs: {
          // Since storybook overwrites the `allow` option, here we set it for sqlite-wasm
          allow: [...(config.server?.fs?.allow ?? []), ".."],
        },
      },
    })
  },
}
export default config
