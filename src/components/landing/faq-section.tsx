'use client';

import { Container } from '@/components/Container';
import { ScrollReveal } from '@/components/ScrollReveal';
import { getLocaleFromPathname } from '@/lib/locale';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const faqCopy = {
  id: {
    title: 'FAQ',
    subtitle:
      'Pertanyaan yang paling sering ditanyakan tentang cara kerja Pesan AI untuk membantu bisnis Anda membalas chat dan mengelola booking secara otomatis.',
    items: [
      {
        question: 'Apa itu Pesan AI?',
        answer:
          'Pesan AI adalah platform AI Agent WhatsApp yang membantu bisnis membalas chat pelanggan secara otomatis, ramah, dan real-time, sekaligus menangani proses booking tanpa intervensi manual.',
      },
      {
        question: 'Apakah AI ini benar-benar bisa disesuaikan (custom)?',
        answer:
          'Ya, Pesan AI dapat dikustomisasi hampir 100% sesuai kebutuhan bisnis Anda. Mulai dari alur percakapan, gaya bahasa, hingga sistem booking dan personalisasi layanan dapat disesuaikan sepenuhnya. Platform chat (WhatsApp) tetap sama, namun seluruh pengalaman di dalamnya bisa diatur sesuai kebutuhan Anda.',
      },
      {
        question: 'Apakah Pesan AI cocok untuk semua jenis bisnis?',
        answer:
          'Bisa. Pesan AI cocok untuk berbagai bisnis yang membutuhkan respon cepat dan sistem booking, seperti klinik, salon, jasa, UMKM, hingga layanan profesional lainnya.',
      },
      {
        question:
          'Apakah pelanggan akan tahu bahwa mereka berbicara dengan AI?',
        answer:
          'Pesan AI dirancang untuk memberikan respon yang natural dan ramah seperti manusia. Anda juga bisa menyesuaikan gaya komunikasi sesuai branding bisnis Anda.',
      },
      {
        question: 'Bagaimana sistem booking otomatis bekerja?',
        answer:
          'AI akan menanyakan data pelanggan, mengecek ketersediaan jadwal booking, lalu memberi informasi apakah slot tersedia atau tidak. Jika penuh, AI dapat menyarankan waktu alternatif yang masih kosong secara otomatis.',
      },
      {
        question: 'Apakah saya perlu skill teknis untuk menggunakan Pesan AI?',
        answer:
          'Tidak. Anda hanya perlu menggunakan web chat yang sudah disediakan. Untuk pengaturan AI, alur, dan sistem lainnya cukup didiskusikan dengan tim kami, semua akan kami siapkan. Anda tinggal menggunakan, dan kami akan memberikan akun yang siap pakai.',
      },
    ],
  },
  en: {
    title: 'FAQ',
    subtitle:
      'The most common questions about how Pesan AI helps your business reply to customer chats and handle booking flows automatically.',
    items: [
      {
        question: 'What is Pesan AI?',
        answer:
          'Pesan AI is a WhatsApp AI Agent platform that helps businesses reply to customer chats automatically, naturally, and in real time, while handling booking flows without manual intervention.',
      },
      {
        question: 'Can this AI really be customized?',
        answer:
          'Yes. Pesan AI can be customized almost 100% for your business needs. From conversation flow and communication style to booking rules and service personalization, everything can be configured. The chat platform remains WhatsApp, but the entire in-chat experience can be tailored.',
      },
      {
        question: 'Is Pesan AI suitable for all business types?',
        answer:
          'Yes. Pesan AI works well for many businesses that need fast responses and booking workflows, including clinics, salons, service businesses, SMEs, and other professional services.',
      },
      {
        question: 'Will customers know they are talking to AI?',
        answer:
          'Pesan AI is designed to respond naturally and politely like a human assistant. You can also tune the communication tone to match your brand voice.',
      },
      {
        question: 'How does the automated booking system work?',
        answer:
          'The AI asks for customer details, checks schedule availability, and informs whether a booking slot is available. If a slot is full, the AI can automatically recommend alternative available times.',
      },
      {
        question: 'Do I need technical skills to use Pesan AI?',
        answer:
          'No. You only need to use the provided web chat. For AI setup, conversation flow, and system configuration, you can discuss everything with our team and we will prepare it for you. You simply use it with a ready-to-use account.',
      },
    ],
  },
} as const;

export function FAQSection() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const copy = faqCopy[locale];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-background py-20 sm:py-24">
      <Container>
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <ScrollReveal
            className="max-w-xl lg:sticky lg:top-28 lg:self-start lg:pt-1"
            distance={24}
          >
            <p className="text-sm font-semibold tracking-[0.18em] text-brand/70">
              {copy.title}
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-brand sm:text-4xl">
              {locale === 'id' ? 'Pertanyaan umum' : 'Common questions'}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-brand/75 sm:text-[0.95rem]">
              {copy.subtitle}
            </p>
          </ScrollReveal>

          <ScrollReveal className="w-full lg:ml-auto lg:max-w-180" delay={120}>
            {copy.items.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={item.question}
                  className="border-b border-brand/20 last:border-b-0"
                >
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between gap-3 py-5 text-left sm:py-6"
                    onClick={() => {
                      setOpenIndex(isOpen ? null : index);
                    }}
                    aria-expanded={isOpen}
                  >
                    <span
                      className={cn(
                        'pr-2 text-base font-semibold leading-snug transition-colors sm:text-[1.05rem]',
                        isOpen ? 'text-brand' : 'text-brand/90',
                      )}
                    >
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 transition-transform duration-300',
                        isOpen ? 'rotate-180 text-brand' : 'text-brand/45',
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    className={cn(
                      'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
                      isOpen
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 pr-7 text-sm leading-relaxed text-brand/75 sm:pb-6 sm:pr-10 sm:text-[0.95rem]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
