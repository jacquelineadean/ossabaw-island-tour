import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './story/base.css';
import './story/story.css';
import './tour/tour.css';
import App from './App.tsx';
import { applyHoliday, holidayAtStart } from './tour/holiday';
import { readText } from './tour/storage';

// Set the saved theme and the holiday theme before the first paint, so neither flashes in late.
const theme = readText('chronicle-theme');
if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
applyHoliday(holidayAtStart());
// Each tour screen starts at the top; the browser should not restore old scroll positions.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
