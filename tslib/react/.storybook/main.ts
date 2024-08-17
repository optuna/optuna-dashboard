import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],

  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@chromatic-com/storybook",
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {},
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

  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
}
export default config
