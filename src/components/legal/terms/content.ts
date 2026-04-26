import type { AppLocale } from '@/lib/locale';

export interface TermsSection {
  id: string;
  label: string;
}

export interface TermsContent {
  title: string;
  heroAlt: string;
  updatedLabel: string;
  tocTitle: string;
  sections: TermsSection[];
  acceptanceHeading: string;
  acceptanceText: string;
  serviceHeading: string;
  serviceText: string;
  ipHeading: string;
  ipText: string;
  obligationsHeading: string;
  obligationsIntro: string;
  obligationsItems: string[];
  liabilityHeading: string;
  liabilityText: string;
  lawHeading: string;
  lawText: string;
}

export const termsContent: Record<AppLocale, TermsContent> = {
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
      'Dengan mengakses atau menggunakan website Pesan AI, Anda setuju untuk terikat dan mematuhi Syarat Layanan ini. Jika Anda tidak menyetujui bagian mana pun dari syarat ini, Anda tidak diperkenankan mengakses atau menggunakan layanan kami.',
    serviceHeading: '2. Deskripsi Layanan',
    serviceText:
      'Pesan AI adalah platform manajemen percakapan dan otomasi pesan cerdas yang terintegrasi dengan WhatsApp Business API. Kami menyediakan fitur agent AI, webhook eksternal, dan pengelolaan database percakapan (WABA) untuk mempermudah bisnis Anda melayani pelanggan.',
    ipHeading: '3. Hak Kekayaan Intelektual',
    ipText:
      'Website dan platform Pesan AI beserta konten asli, struktur database, model AI dan fungsionalitasnya adalah dan akan tetap menjadi milik eksklusif platform kami. Anda tidak diberikan lisensi untuk menggunakan merek dagang kami tanpa izin tertulis dari kami.',
    obligationsHeading: '4. Kewajiban Pengguna',
    obligationsIntro:
      'Saat mendaftar dan menggunakan platform kami, Anda setuju untuk tidak:',
    obligationsItems: [
      'Mengirimkan konten atau materi pesanan yang melanggar kebijakan WhatsApp (Commerce/Business Policy) atau aturan hukum di Indonesia.',
      'Mencoba melakukan reverse engineering, dekompilasi, atau mengeksploitasi celah keamanan sistem Pesan AI dan server kami.',
      'Mengganggu kinerja sistem atau mengirim antrean pesan secara berlebihan yang mengarah ke tindakan serangan server (seperti DDoS).',
      'Menyalahgunakan kredensial webhook dan nomor WABA yang diregistrasikan di luar batas kewajaran.',
    ],
    liabilityHeading: '5. Batasan Tanggung Jawab',
    liabilityText:
      'Pesan AI memfasilitasi koneksi ke Meta/WhatsApp API. Kami tidak bertanggung jawab atas pemblokiran nomor WABA Anda oleh pihak Meta, kerugian finansial atau kehilangan data pelanggan, serta downtime yang disebabkan oleh penyedia layanan pihak ketiga. Penggunaan layanan kami merupakan risiko Anda sendiri.',
    lawHeading: '6. Hukum yang Berlaku',
    lawText:
      'Syarat ini diatur dan ditafsirkan sesuai hukum yang berlaku di Indonesia. Setiap perselisihan yang timbul dari layanan ini atau Syarat Layanan ini akan diselesaikan secara eksklusif dalam yurisdiksi pengadilan di Indonesia.',
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
      'By accessing or using the Pesan AI website and platform, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services.',
    serviceHeading: '2. Description of Service',
    serviceText:
      'Pesan AI is an intelligent conversation management and messaging automation platform integrated with the WhatsApp Business API. We provide AI chat agents, webhook integrations, and WABA conversation management features to help streamline your business communication.',
    ipHeading: '3. Intellectual Property',
    ipText:
      'The Pesan AI website, platform, original content, database structure, and AI models are and will remain the exclusive property of our platform. You are not granted any license to use our trademarks without prior written consent.',
    obligationsHeading: '4. User Obligations',
    obligationsIntro:
      'When registering and utilizing our platform, you agree not to:',
    obligationsItems: [
      "Transmit any content that violates Meta's WhatsApp Commerce/Business Policies or any applicable laws.",
      'Attempt to reverse engineer, decompile, or exploit our underlying code or server infrastructure.',
      'Disrupt service performance or dispatch excessive malicious message queues resulting in DDoS or abuse.',
      'Misuse webhook credentials or WABA numbers registered under your account.',
    ],
    liabilityHeading: '5. Limitation of Liability',
    liabilityText:
      'Pesan AI facilitates connection to Meta/WhatsApp API. We are not liable for WABA number suspensions enacted by Meta, direct or indirect financial loss, data loss, or downtime caused by third-party providers. Your use of our service is securely at your own risk.',
    lawHeading: '6. Governing Law',
    lawText:
      'These Terms shall be governed and construed in accordance with the laws of Indonesia. Any dispute arising from these services or these Terms shall be resolved exclusively within the jurisdiction of Indonesian courts.',
  },
};
