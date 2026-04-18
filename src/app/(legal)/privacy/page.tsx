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
      'Selamat datang di Pesan AI ("kami"). Kami adalah platform manajemen dan otomasi pesan cerdas melalui WhatsApp Business API. Kami menghormati privasi Anda dan berkomitmen melindungi data pribadi Anda. Kebijakan privasi ini menjelaskan bagaimana kami mengelola data pribadi Anda dan data pelanggan Anda saat Anda mengunjungi website kami atau menggunakan layanan kami.',
    collectionHeading: '2. Data yang Kami Kumpulkan',
    collectionIntro:
      'Kami dapat mengumpulkan, menggunakan, menyimpan, dan mentransfer berbagai jenis data untuk mengoperasikan layanan kami:',
    collectionItems: [
      {
        label: 'Data Identitas dan Kontak:',
        value:
          'Mencakup nama, alamat email, nomor telepon WhatsApp, profil bisnis, dan informasi login Anda.',
      },
      {
        label: 'Data Pesan dan Pelanggan:',
        value:
          'Mencakup isi pesan, riwayat percakapan, kontak pelanggan, dan data interaksi yang Anda proses menggunakan platform kami.',
      },
      {
        label: 'Data Teknis:',
        value:
          'Mencakup alamat internet protocol (IP), data login, jenis browser, webhook payload, integrasi API, dan sistem operasi.',
      },
      {
        label: 'Data Penggunaan:',
        value:
          'Mencakup informasi tentang cara Anda menggunakan website, metrik pengiriman pesan, dan otomasi AI di dalam platform kami.',
      },
    ],
    usageHeading: '3. Cara Kami Menggunakan Data Anda',
    usageIntro:
      'Kami menggunakan data pribadi dan data operasional Anda dalam kondisi berikut:',
    usageItems: [
      'Untuk mengoperasikan dan menyediakan layanan pengiriman dan otomasi pesan WhatsApp Business.',
      'Untuk memproses interaksi AI pada percakapan Anda dengan pelanggan sesuai pengaturan yang Anda buat.',
      'Untuk mengelola akun Anda dan memberikan dukungan layanan pelanggan teknis.',
      'Untuk meningkatkan algoritma AI dan antarmuka platform demi kenyamanan pengguna.',
      'Untuk memenuhi kewajiban operasional dari Meta/WhatsApp dan regulasi lokal yang berlaku.',
    ],
    securityHeading: '4. Keamanan Data',
    securityText:
      'Kami mengimplementasikan standar keamanan industri yang kuat untuk melindungi data komunikasi bisnis dan data pribadi Anda dari akses yang tidak sah. Konversi pesan dengan AI diproses secara aman, dan akses ke percakapan Anda dibatasi hanya kepada pemilik akun dan anggota tim yang Anda percayakan.',
    contactHeading: '5. Kontak',
    contactText:
      'Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau cara pengelolaan data pesan Anda, silakan hubungi tim dukungan kami di website Pesan AI.',
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
      'Welcome to Pesan AI ("we," "our," or "us"). We are an intelligent messaging and automation platform powered by the WhatsApp Business API. We respect your privacy and are committed to protecting your personal data. This privacy policy informs you how we look after your personal data and your customers\' messaging data when you use our services.',
    collectionHeading: '2. The Data We Collect',
    collectionIntro:
      'We may collect, use, store, and transfer different kinds of data necessary to operate our platform:',
    collectionItems: [
      {
        label: 'Identity and Contact Data:',
        value:
          'Includes your name, email address, WhatsApp phone numbers, business profiles, and login credentials.',
      },
      {
        label: 'Messaging and Customer Data:',
        value:
          'Includes message content, conversation history, customer contacts, and interaction data processed through our platform.',
      },
      {
        label: 'Technical Data:',
        value:
          'Includes internet protocol (IP) address, login data, browser types, webhook payloads, API integrations, and operating systems.',
      },
      {
        label: 'Usage Data:',
        value:
          'Includes information about how you use our website, messaging metrics, and AI automation interactions.',
      },
    ],
    usageHeading: '3. How We Use Your Data',
    usageIntro:
      'We use your personal and operational data primarily in the following circumstances:',
    usageItems: [
      'To operate and provide WhatsApp Business messaging and automation services.',
      'To process AI interactions in your customer conversations based on your configurations.',
      'To manage your account and provide technical customer support.',
      'To improve our AI algorithms, user interface, and overall platform reliability.',
      "To comply with Meta/WhatsApp's operational guidelines and applicable local regulations.",
    ],
    securityHeading: '4. Data Security',
    securityText:
      'We implement robust industry-standard security measures to protect your business communication and personal data against unauthorized access. AI-processed conversations are handled securely, and access to your conversation history is restricted strictly to you and your authorized team members.',
    contactHeading: '5. Contact Details',
    contactText:
      'If you have any questions about this privacy policy or our data management practices, please contact our support team through the Pesan AI website.',
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
