import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Overview from '@/pages/Overview';
import RealTimeMonitor from '@/pages/RealTimeMonitor';
import Alerts from '@/pages/Alerts';
import ThreatIntel from '@/pages/ThreatIntel';
import NetworkMap from '@/pages/NetworkMap';
import Sessions from '@/pages/Sessions';
import ProtocolAnalysis from '@/pages/ProtocolAnalysis';
import NetworkDiscovery from '@/pages/NetworkDiscovery';
import PerformanceMonitor from '@/pages/PerformanceMonitor';
import AIAssistant from '@/pages/AIAssistant';
import Assets from '@/pages/Assets';
import Reports from '@/pages/Reports';
import AuditLogs from '@/pages/AuditLogs';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[hsl(222,47%,6%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-mono">Initializing NetShield...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/monitor" element={<RealTimeMonitor />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/threat-intel" element={<ThreatIntel />} />
          <Route path="/network-map" element={<NetworkMap />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/protocol-analysis" element={<ProtocolAnalysis />} />
          <Route path="/network-discovery" element={<NetworkDiscovery />} />
          <Route path="/performance" element={<PerformanceMonitor />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App