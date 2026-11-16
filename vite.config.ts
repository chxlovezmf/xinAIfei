import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

const localArtFiles = ['分类的五个分类图.png.png', '支出的十二个分类图.png']

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'exclude-local-source-art',
      apply: 'build',
      writeBundle(options) {
        if (!options.dir) return
        for (const file of localArtFiles) {
          rmSync(resolve(options.dir, 'themes/bubu', file), { force: true })
        }
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'app-icon-48.png', 'app-icon-180.png', 'app-icon-192.png', 'app-icon-512.png'],
      manifest: {
        name: '鑫菲日记 - 记事记账本',
        short_name: '鑫菲日记',
        description: '精致的个人记事+记账应用',
        theme_color: '#14b8a6',
        background_color: '#faf8f6',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
