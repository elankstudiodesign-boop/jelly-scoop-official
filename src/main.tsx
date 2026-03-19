import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

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
    <App />
  </StrictMode>,
);
