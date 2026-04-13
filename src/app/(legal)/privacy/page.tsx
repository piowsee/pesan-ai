'use client';

import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { getDateLocale, getLocaleFromPathname } from '@/lib/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const privacyContent = {
  id: {
    title: 'Kebijakan Privasi',
    heroAlt: 'Hero kebijakan privasi',
    updatedLabel: 'Pembaruan Terakhir',
    tocTitle: 'Daftar isi',
    sections: [
      { id: 'introduction', label: 'Pendahuluan' },
      { id: 'data-collection', label: 'Data yang Kami Kumpulkan' },
      { id: 'data-use', label: 'Cara Kami Menggunakan Data Anda' },
      { id: 'security', label: 'Keamanan Data' },
      { id: 'contact', label: 'Kontak' },
    ],
    introductionHeading: '1. Pendahuluan',
    introductionText:
      'Selamat datang di piowsee ("kami"). Kami adalah software house Indonesia yang berfokus pada produk digital cerdas, termasuk namun tidak terbatas pada integrasi AI, aplikasi web kustom, dan sistem data seperti pocv dan Pesan AI. Kami menghormati privasi Anda dan berkomitmen melindungi data pribadi Anda. Kebijakan privasi ini menjelaskan bagaimana kami mengelola data pribadi Anda saat mengunjungi website kami atau menggunakan layanan kami.',
    collectionHeading: '2. Data yang Kami Kumpulkan',
    collectionIntro:
      'Kami dapat mengumpulkan, menggunakan, menyimpan, dan mentransfer berbagai jenis data pribadi Anda. Saat Anda berkonsultasi dengan engineer kami atau menggunakan platform kami, data yang dapat kami kumpulkan meliputi:',
    collectionItems: [
      {
        label: 'Data Identitas dan Kontak:',
        value:
          'Mencakup nama depan, nama belakang, username, alamat email, nomor telepon, dan nama perusahaan.',
      },
      {
        label: 'Data Teknis:',
        value:
          'Mencakup alamat internet protocol (IP), data login, jenis dan versi browser, zona waktu dan lokasi, jenis dan versi plug-in browser, sistem operasi, serta platform.',
      },
      {
        label: 'Data Penggunaan:',
        value:
          'Mencakup informasi tentang cara Anda menggunakan website, produk, dan layanan kami (misalnya interaksi dengan agen AI kami seperti Pesan AI).',
      },
      {
        label: 'Data Kandidat (melalui pocv):',
        value:
          'Jika menggunakan AI Resume Builder kami, kami memproses data resume sementara untuk tujuan eksplisit optimasi ATS dan penulisan ulang, serta tidak digunakan untuk pelatihan AI umum.',
      },
    ],
    usageHeading: '3. Cara Kami Menggunakan Data Anda',
    usageIntro:
      'Kami hanya akan menggunakan data pribadi Anda jika diizinkan oleh hukum. Umumnya, data pribadi Anda digunakan dalam kondisi berikut:',
    usageItems: [
      'Untuk menyediakan dan menjalankan layanan pengembangan software serta produk digital kami.',
      'Untuk mengelola hubungan kami dengan Anda, termasuk konsultasi dan dukungan platform.',
      'Untuk meningkatkan platform kami (pocv, Pesan AI) dan memastikan integrasi AI berjalan efisien serta aman.',
      'Untuk memenuhi kewajiban hukum atau regulasi yang berlaku di Indonesia.',
    ],
    securityHeading: '4. Keamanan Data',
    securityText:
      'Kami telah menerapkan langkah-langkah keamanan yang memadai untuk mencegah data pribadi Anda hilang secara tidak sengaja, digunakan, diakses tanpa izin, diubah, atau diungkapkan. Akses terhadap data pribadi Anda dibatasi hanya kepada karyawan, agen, kontraktor, dan pihak ketiga yang memiliki kebutuhan bisnis untuk mengetahui data tersebut.',
    contactHeading: '5. Kontak',
    contactText:
      'Jika Anda memiliki pertanyaan mengenai kebijakan privasi ini atau praktik privasi kami, silakan hubungi kami. piowsee dikembangkan dan berkantor pusat di Indonesia.',
  },
  en: {
    title: 'Privacy Policy',
    heroAlt: 'Privacy policy hero',
    updatedLabel: 'Last Updated',
    tocTitle: 'Table of contents',
    sections: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'data-collection', label: 'The Data We Collect' },
      { id: 'data-use', label: 'How We Use Your Data' },
      { id: 'security', label: 'Data Security' },
      { id: 'contact', label: 'Contact Details' },
    ],
    introductionHeading: '1. Introduction',
    introductionText:
      'Welcome to piowsee ("we," "our," or "us"). We are an Indonesian software house specializing in intelligent digital products, including but not limited to AI integrations, custom web applications, and data systems like pocv and Pesan AI. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) or use our services.',
    collectionHeading: '2. The Data We Collect',
    collectionIntro:
      'We may collect, use, store, and transfer different kinds of personal data about you. When you consult with our engineers or use our platforms, we may collect:',
    collectionItems: [
      {
        label: 'Identity and Contact Data:',
        value:
          'Includes your first name, last name, username, email address, telephone numbers, and company name.',
      },
      {
        label: 'Technical Data:',
        value:
          'Includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system, and platform.',
      },
      {
        label: 'Usage Data:',
        value:
          'Includes information about how you use our website, products, and services (e.g., interactions with our AI agents like Pesan AI).',
      },
      {
        label: 'Candidate Data (via pocv):',
        value:
          'If utilizing our AI Resume Builder, we temporarily process resume data for the explicit purpose of ATS optimization and rewriting, which is not used for generalized AI training.',
      },
    ],
    usageHeading: '3. How We Use Your Data',
    usageIntro:
      'We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:',
    usageItems: [
      'To provide and deliver our software development services and digital products.',
      'To manage our relationship with you, including consulting and platform support.',
      'To improve our platforms (pocv, Pesan AI) and ensure our AI integrations function efficiently and securely.',
      'To comply with a legal or regulatory obligation in Indonesia.',
    ],
    securityHeading: '4. Data Security',
    securityText:
      'We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. We limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.',
    contactHeading: '5. Contact Details',
    contactText:
      'If you have any questions about this privacy policy or our privacy practices, please contact us. piowsee is engineered and headquartered in Indonesia.',
  },
} as const;

export default function PrivacyPolicyPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = privacyContent[locale];
  const sections = copy.sections;

  const [activeSection, setActiveSection] = useState<string>(sections[0].id);

  useEffect(() => {
    setActiveSection(sections[0].id);
  }, [sections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleSections[0]) {
          setActiveSection(visibleSections[0].target.id);
        }
      },
      {
        rootMargin: '-120px 0px -70% 0px',
        threshold: 0.15,
      },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <main className="min-h-screen flex flex-col bg-background font-sans">
      <Navbar />

      <section className="relative -mt-22 h-100 w-full overflow-hidden">
        <Image
          src="/landing/hero.jpg"
          alt={copy.heroAlt}
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-24 pt-32 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            {copy.title}
          </h1>

          <p className="mt-4 text-lg text-white/80">
            {copy.updatedLabel}:{' '}
            {new Date().toLocaleDateString(getDateLocale(locale), {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </section>

      <section className="flex justify-center px-6 py-20">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-14 md:grid-cols-[240px_1fr]">
          <aside className="sticky top-30 hidden h-fit md:block">
            <h3 className="mb-5 text-sm font-semibold text-brand">
              {copy.tocTitle}
            </h3>

            <ul className="space-y-3 text-sm text-brand/70">
              {sections.map((section) => {
                const isActive = activeSection === section.id;

                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={cn(
                        'transition',
                        isActive
                          ? 'text-brand'
                          : 'text-brand/70 hover:text-brand',
                      )}
                    >
                      {section.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="prose prose-zinc max-w-none lg:prose-lg">
            <h2
              id="introduction"
              className="scroll-mt-25 mt-0 mb-4 text-2xl font-bold text-zinc-900"
            >
              {copy.introductionHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.introductionText}
            </p>

            <h2
              id="data-collection"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.collectionHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.collectionIntro}
            </p>

            <ul className="mb-6 list-disc space-y-2 pl-6 text-zinc-600">
              {copy.collectionItems.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}</strong> {item.value}
                </li>
              ))}
            </ul>

            <h2
              id="data-use"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.usageHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.usageIntro}
            </p>

            <ul className="mb-6 list-disc space-y-2 pl-6 text-zinc-600">
              {copy.usageItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2
              id="security"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.securityHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.securityText}
            </p>

            <h2
              id="contact"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.contactHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.contactText}
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
