import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default {
  integrations: [
    tailwind({ config: { applyBaseStyles: true } }),
    react()
  ],
  output: 'static'
};
