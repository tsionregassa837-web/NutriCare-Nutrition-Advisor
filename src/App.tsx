import { AppProvider, useApp, useRoute } from './ctx';
import { Login, Onboarding, Register } from './pages/Auth';
import { Advisor } from './pages/Advisor';
import { Analytics } from './pages/Analytics';
import { Analysis, Scan } from './pages/Scan';
import { Diary, Foods } from './pages/Diary';
import { Home } from './pages/Home';
import { Planner } from './pages/Planner';
import { Profile, ProfileSub } from './pages/Profile';
import { useState } from 'react';
import type { AnalysisResult } from './pages/Scan';

const PUBLIC = ['/', '/onboarding', '/login', '/register'];

function Router() {
  const { user, ready } = useApp();
  const { path, params } = useRoute();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  if (!ready) return <div className="screen"><p className="center muted pad">Loading...</p></div>;
  if (!user && !PUBLIC.includes(path)) { window.location.hash = '#/login'; return null; }
  if (user && PUBLIC.includes(path) && path !== '/onboarding') { window.location.hash = '#/home'; return null; }
  if (path.startsWith('/profile/')) return <ProfileSub page={path.split('/')[2]} setup={params.get('setup') === '1'} />;
  switch (path) {
    case '/login': return <Login />;
    case '/register': return <Register />;
    case '/home': return <Home />;
    case '/diary': return <Diary params={params} />;
    case '/foods': return <Foods params={params} />;
    case '/scan': return <Scan onResult={setAnalysis} />;
    case '/analysis': return <Analysis result={analysis} />;
    case '/advisor': return <Advisor params={params} />;
    case '/planner': return <Planner />;
    case '/analytics': return <Analytics />;
    case '/profile': return <Profile />;
    default: return <Onboarding />;
  }
}

export function App() { return <AppProvider><Router /></AppProvider>; }