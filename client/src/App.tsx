/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { initSmoothScrolling } from '@/lib/gsap';
import { Navbar } from '@/components/layout/Navbar';
import { CustomCursor } from '@/components/ui/CustomCursor';
import { Preloader } from '@/components/ui/Preloader';
import { ConduitLoader } from '@/components/ui/ConduitLoader';
import { useWalletStore } from '@/stores/walletStore';

const Home = React.lazy(() => import('@/pages/Home').then(m => ({ default: m.Home })));
const Dashboard = React.lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Bonds = React.lazy(() => import('@/pages/Bonds').then(m => ({ default: m.Bonds })));
const BondDetail = React.lazy(() => import('@/pages/BondDetail').then(m => ({ default: m.BondDetail })));
const Agent = React.lazy(() => import('@/pages/Agent').then(m => ({ default: m.Agent })));
const Onboarding = React.lazy(() => import('@/pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Race = React.lazy(() => import('@/pages/Race').then(m => ({ default: m.Race })));
const NFTs = React.lazy(() => import('@/pages/NFTs').then(m => ({ default: m.NFTs })));
const Creators = React.lazy(() => import('@/pages/Creators').then(m => ({ default: m.Creators })));
const CreatorProfile = React.lazy(() => import('@/pages/CreatorProfile').then(m => ({ default: m.CreatorProfile })));
const Docs = React.lazy(() => import('@/pages/Docs').then(m => ({ default: m.Docs })));

export default function App() {
  const checkConnection = useWalletStore((state) => state.checkConnection);

  useEffect(() => {
    const lenis = initSmoothScrolling();
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  return (
    <Router>
      <Preloader />
      <CustomCursor />
      <Navbar />

      <main className="relative z-10">
        <Suspense fallback={<div className="h-[calc(100vh-80px)] w-full flex items-center justify-center"><ConduitLoader /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bonds" element={<Bonds />} />
            <Route path="/bonds/:id" element={<BondDetail />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/race" element={<Race />} />
            <Route path="/nfts" element={<NFTs />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/creators/:id" element={<CreatorProfile />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:topic" element={<Docs />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Routes>
        </Suspense>
      </main>
    </Router>
  );
}
