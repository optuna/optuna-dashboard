import {
  Controls,
  Description,
  Primary,
  Subtitle,
  Title,
} from "@storybook/addon-docs/blocks"
import type { Preview } from "@storybook/react-vite"

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Description />
          <Primary />
          <Controls />
        </>
      ),
    },
  },
}

export default preview
