'use client';

import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { getDateLocale, getLocaleFromPathname } from '@/lib/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const termsContent = {
  id: {
    title: 'Syarat Layanan',
    heroAlt: 'Hero syarat layanan',
    updatedLabel: 'Pembaruan Terakhir',
    tocTitle: 'Daftar isi',
    sections: [
      { id: 'acceptance', label: 'Penerimaan Syarat' },
      { id: 'service', label: 'Deskripsi Layanan' },
      { id: 'ip', label: 'Hak Kekayaan Intelektual' },
      { id: 'obligations', label: 'Kewajiban Pengguna' },
      { id: 'liability', label: 'Batasan Tanggung Jawab' },
      { id: 'law', label: 'Hukum yang Berlaku' },
    ],
    acceptanceHeading: '1. Penerimaan Syarat',
    acceptanceText:
      'Dengan mengakses atau menggunakan website piowsee, berkonsultasi dengan engineer kami, atau menggunakan platform software kami (termasuk namun tidak terbatas pada pocv dan Pesan AI), Anda setuju untuk terikat oleh Syarat Layanan ini. Jika Anda tidak menyetujui bagian mana pun dari syarat ini, Anda tidak diperkenankan mengakses layanan kami.',
    serviceHeading: '2. Deskripsi Layanan',
    serviceText:
      'piowsee adalah software house yang menyediakan pengembangan produk digital kustom, integrasi AI, aplikasi web, dan platform internal proprietari untuk mengotomatisasi kompleksitas. Deliverable dan layanan spesifik kami tunduk pada master service agreement (MSA) atau statement of work (SOW) terpisah yang disepakati bersama klien.',
    ipHeading: '3. Hak Kekayaan Intelektual',
    ipText:
      'Website piowsee beserta konten asli, fitur, dan fungsionalitasnya adalah dan akan tetap menjadi milik eksklusif piowsee dan para pemberi lisensinya. Kecuali dinyatakan secara eksplisit dalam kontrak pengembangan software kustom, piowsee mempertahankan hak kekayaan intelektual atas codebase proprietari, model AI, dan tools internal kami.',
    obligationsHeading: '4. Kewajiban Pengguna',
    obligationsIntro:
      'Saat berinteraksi dengan website atau platform kami, Anda setuju untuk tidak:',
    obligationsItems: [
      'Menggunakan layanan untuk tujuan ilegal atau tanpa otorisasi.',
      'Mencoba melakukan reverse engineering, dekompilasi, atau mengekstrak source code software yang disediakan oleh piowsee.',
      'Mengganggu integritas atau kinerja layanan maupun data yang terdapat di dalamnya.',
    ],
    liabilityHeading: '5. Batasan Tanggung Jawab',
    liabilityText:
      'Dalam kondisi apa pun, piowsee, direktur, karyawan, partner, agen, pemasok, atau afiliasinya tidak bertanggung jawab atas kerugian tidak langsung, insidental, khusus, konsekuensial, atau hukuman, termasuk namun tidak terbatas pada kehilangan keuntungan, data, penggunaan, goodwill, atau kerugian tidak berwujud lainnya, yang timbul dari akses, penggunaan, atau ketidakmampuan Anda dalam mengakses atau menggunakan layanan.',
    lawHeading: '6. Hukum yang Berlaku',
    lawText:
      'Syarat ini diatur dan ditafsirkan sesuai hukum yang berlaku di Indonesia, tanpa memperhatikan ketentuan konflik hukum. Kegagalan kami untuk menegakkan hak atau ketentuan apa pun dalam Syarat ini tidak dianggap sebagai pelepasan hak tersebut.',
  },
  en: {
    title: 'Terms of Service',
    heroAlt: 'Terms of service hero',
    updatedLabel: 'Last Updated',
    tocTitle: 'Table of contents',
    sections: [
      { id: 'acceptance', label: 'Acceptance of Terms' },
      { id: 'service', label: 'Description of Service' },
      { id: 'ip', label: 'Intellectual Property' },
      { id: 'obligations', label: 'User Obligations' },
      { id: 'liability', label: 'Limitation of Liability' },
      { id: 'law', label: 'Governing Law' },
    ],
    acceptanceHeading: '1. Acceptance of Terms',
    acceptanceText:
      'By accessing or using the piowsee website, consulting with our engineers, or utilizing our software platforms (including but not limited to pocv and Pesan AI), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services.',
    serviceHeading: '2. Description of Service',
    serviceText:
      'piowsee is a software house providing custom digital product development, AI integrations, web applications, and proprietary internal platforms designed to automate complexity. Our specific deliverables and services are subject to separate master service agreements (MSAs) or statements of work (SOWs) established with clients.',
    ipHeading: '3. Intellectual Property',
    ipText:
      'The piowsee website and its original content, features, and functionality are and will remain the exclusive property of piowsee and its licensors. Unless explicitly stated in a custom software development contract, piowsee retains the underlying intellectual property rights to our proprietary codebases, AI models, and internal tools.',
    obligationsHeading: '4. User Obligations',
    obligationsIntro:
      'When interacting with our website or platforms, you agree not to:',
    obligationsItems: [
      'Use the services for any illegal or unauthorized purpose.',
      'Attempt to reverse engineer, decompile, or otherwise extract the source code of the software provided by piowsee.',
      'Interfere with or disrupt the integrity or performance of the services or the data contained therein.',
    ],
    liabilityHeading: '5. Limitation of Liability',
    liabilityText:
      'In no event shall piowsee, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the services.',
    lawHeading: '6. Governing Law',
    lawText:
      'These Terms shall be governed and construed in accordance with the laws of Indonesia, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.',
  },
} as const;

export default function TermsOfServicePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = termsContent[locale];
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
              id="acceptance"
              className="mt-0 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.acceptanceHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.acceptanceText}
            </p>

            <h2
              id="service"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.serviceHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.serviceText}
            </p>

            <h2
              id="ip"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.ipHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">{copy.ipText}</p>

            <h2
              id="obligations"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.obligationsHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.obligationsIntro}
            </p>

            <ul className="mb-6 list-disc space-y-2 pl-6 text-zinc-600">
              {copy.obligationsItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2
              id="liability"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.liabilityHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">
              {copy.liabilityText}
            </p>

            <h2
              id="law"
              className="mt-8 mb-4 scroll-mt-25 text-2xl font-bold text-zinc-900"
            >
              {copy.lawHeading}
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-600">{copy.lawText}</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
