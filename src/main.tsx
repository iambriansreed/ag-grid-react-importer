import { createRoot } from 'react-dom/client';
import App from './app';

import './style.scss';

(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    createRoot(document.getElementById('root')!).render(<App />);
})();
