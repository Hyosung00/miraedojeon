import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';
import path from 'path'; // 반드시 필요
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_URL = env.VITE_APP_BASE_NAME || '/';
  const PORT = 3000;

  return {
    server: {
      open: true,
      port: PORT,
      host: true
    },
    preview: {
      open: true,
      host: true
    },
    define: {
      global: 'window',
      CESIUM_BASE_URL: JSON.stringify('/cesium/')
    },
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        { find: 'assets', replacement: path.resolve(__dirname, 'src/assets') },
        { find: 'components', replacement: path.resolve(__dirname, 'src/components') }
      ]
    },
    base: '/',
    plugins: [
      react(),
      jsconfigPaths(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/cesium/Build/Cesium/Workers',
            dest: 'cesium'
          },
          {
            src: 'node_modules/cesium/Build/Cesium/ThirdParty',
            dest: 'cesium'
          },
          {
            src: 'node_modules/cesium/Build/Cesium/Assets',
            dest: 'cesium'
          },
          {
            src: 'node_modules/cesium/Build/Cesium/Widgets',
            dest: 'cesium'
          }
        ]
      })
    ]
  };
});
