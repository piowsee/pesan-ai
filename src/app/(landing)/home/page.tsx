import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/landing/hero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Landing Page',
  description: 'Welcome to the landing page of pesan-ai.',
};

export default function LandingRoutePage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </div>
  );
}
