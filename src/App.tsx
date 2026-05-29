import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CardSelectPage from './pages/CardSelectPage';
import CardLearnPage from './pages/CardLearnPage';
import LoadingPage from './pages/LoadingPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import DailyCompletePage from './pages/DailyCompletePage';
import MockDevPanel from './components/common/MockDevPanel';

import SituationStep1Page from './pages/SituationStep1Page';
import SituationStep2Page from './pages/SituationStep2Page';
import SituationStep3Page from './pages/SituationStep3Page';
import SituationResultPage from './pages/SituationResultPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CardSelectPage />} />
        <Route path="/learn" element={<CardLearnPage />} />
        <Route path="/loading" element={<LoadingPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/daily-complete" element={<DailyCompletePage />} />

        <Route path="/situations/:id/step1" element={<SituationStep1Page />} />
        <Route path="/situations/:id/step2" element={<SituationStep2Page />} />
        <Route path="/situations/:id/step3" element={<SituationStep3Page />} />
        <Route path="/situations/:id/result" element={<SituationResultPage />} />
      </Routes>
      {/* Floating dev panel — runtime mock toggle + scenario picker.
          Off by default. Enable for a session by setting
          VITE_SHOW_DEV_PANEL=true in .env.local (or a one-off
          `VITE_SHOW_DEV_PANEL=true pnpm dev`). Production builds always
          strip it because of the DEV guard. */}
      {import.meta.env.DEV &&
        import.meta.env.VITE_SHOW_DEV_PANEL === 'true' && <MockDevPanel />}
    </BrowserRouter>
  );
}
