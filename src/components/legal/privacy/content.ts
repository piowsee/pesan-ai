import type { AppLocale } from '@/lib/locale';

export interface PrivacySection {
  id: string;
  label: string;
}

export interface CollectionItem {
  label: string;
  value: string;
}

export interface PrivacyContent {
  title: string;
  heroAlt: string;
  updatedLabel: string;
  tocTitle: string;
  sections: PrivacySection[];
  introductionHeading: string;
  introductionText: string;
  collectionHeading: string;
  collectionIntro: string;
  collectionItems: CollectionItem[];
  usageHeading: string;
  usageIntro: string;
  usageItems: string[];
  securityHeading: string;
  securityText: string;
  contactHeading: string;
  contactText: string;
}

export const privacyContent: Record<AppLocale, PrivacyContent> = {
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
};
