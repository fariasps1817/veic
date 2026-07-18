import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['atpv-icon.svg'],
      manifest: {
        name: 'ATPV Fácil',
        short_name: 'ATPV Fácil',
        description: 'Formulário auxiliar para ATPV',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#f6f8f6',
        theme_color: '#14532d',
        icons: [
          {
            src: '/atpv-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
