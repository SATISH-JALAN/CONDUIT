/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { initSmoothScrolling } from '@/lib/gsap';
import { Navbar } from '@/components/layout/Navbar';
import { Home } from '@/pages/Home';
import { Dashboard } from '@/pages/Dashboard';
import { Bonds } from '@/pages/Bonds';
import { Agent } from '@/pages/Agent';
import { Onboarding } from '@/pages/Onboarding';
import { Race } from '@/pages/Race';
import { CustomCursor } from '@/components/ui/CustomCursor';

export default function App() {
  useEffect(() => {
    const lenis = initSmoothScrolling();
    return () => lenis.destroy();
  }, []);

  return (
    <Router>
      <CustomCursor />
      <Navbar />
      
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bonds" element={<Bonds />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/race" element={<Race />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </main>
    </Router>
  );
}
