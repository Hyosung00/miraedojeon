import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';
import path from 'path'; // 반드시 필요
import { viteStaticCopy } from 'vite-plugin-static-copy';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_URL = env.VITE_APP_BASE_NAME || '/';
  const PORT = 3000;

  return {
    server: {
      open: true,
      port: PORT,
      host: true,
      proxy: {
        '/neo4j': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        },
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      open: true,
      host: true,
      port: PORT
    },
    define: {
      global: 'window',
      CESIUM_BASE_URL: JSON.stringify('/cesium/')
    },
    build: {
      outDir: '../../Hyosung00.github.io',
      // Production 빌드 최적화
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // console.log 제거
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'], // 특정 함수 제거
          passes: 2 // 최적화 패스 수 증가
        },
        mangle: {
          safari10: true
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // 벤더 청크 분리로 캐싱 최적화
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-vendor': ['@mui/material', '@mui/icons-material'],
            'chart-vendor': ['recharts'],
            'cesium-vendor': ['cesium'],
            'vis-vendor': ['vis-network'],
            'three-vendor': ['three', 'react-force-graph-3d'] // 3D 라이브러리 분리
          },
          // 파일명 해싱으로 캐싱 최적화
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      chunkSizeWarningLimit: 1000, // 청크 크기 경고 한도 증가
      cssCodeSplit: true, // CSS 코드 스플리팅
      sourcemap: false, // Production에서 sourcemap 비활성화
      target: 'esnext',
      assetsInlineLimit: 4096, // 4KB 이하 파일 인라인화
      reportCompressedSize: false, // 빌드 속도 향상
      cssMinify: true // CSS 최소화
    },
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        { find: 'assets', replacement: path.resolve(__dirname, 'src/assets') },
        { find: 'components', replacement: path.resolve(__dirname, 'src/components') }
      ]
    },
    base: '/',
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'three',
        'react-force-graph-3d',
        '@mui/material',
        'cesium'
      ],
      exclude: ['@mui/icons-material'] // 아이콘은 트리 쉐이킹에 맡김
    },
    plugins: [
      react(),
      jsconfigPaths(),
      // Gzip compression for production
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // 10KB 이상만 압축
        deleteOriginFile: false
      }),
      // Brotli compression for production (더 효율적)
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        deleteOriginFile: false
      }),
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
          },
          {
            src: 'public/404.html',
            dest: ''
          },
          {
            src: 'public/.nojekyll',
            dest: ''
          }
        ]
      })
    ]
  };
});
