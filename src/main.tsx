import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Có phiên bản mới. Bạn có muốn cập nhật không?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Ứng dụng đã sẵn sàng để hoạt động ngoại tuyến');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
