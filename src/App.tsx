import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CardSelectPage from './pages/CardSelectPage';
import CardLearnPage from './pages/CardLearnPage';
import LoadingPage from './pages/LoadingPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';

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
      </Routes>
    </BrowserRouter>
  );
}
