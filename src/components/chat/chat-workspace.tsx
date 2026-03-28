'use client';

import { ChatDetail } from '@/components/chat/chat-detail';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ContactInfoPanel } from '@/components/chat/contact-info-panel';
import { ChatWaba, WabaSwitcher } from '@/components/chat/waba-switcher';
import type {
  ChatConversation,
  ChatMessage,
  ChatSidebarFilter,
} from '@/types/chat';
import { InboxIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

// ──────────────────────────────────────────────
// Dummy Data
// ──────────────────────────────────────────────

const now = new Date();
function hoursAgo(h: number) {
  return new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
}
function minutesAgo(m: number) {
  return new Date(now.getTime() - m * 60 * 1000).toISOString();
}

const DUMMY_WABAS: ChatWaba[] = [
  {
    id: 'waba-1',
    wabaId: '100200300',
    businessName: 'Toko Sinar Jaya',
    phoneNumbers: [
      { id: 'pn-1a', displayPhoneNumber: '+62 812-3456-7890' },
      { id: 'pn-1b', displayPhoneNumber: '+62 813-9876-5432' },
    ],
  },
  {
    id: 'waba-2',
    wabaId: '400500600',
    businessName: 'PT Maju Bersama',
    phoneNumbers: [{ id: 'pn-2a', displayPhoneNumber: '+62 821-1111-2222' }],
  },
];

function makeDummyMessage(
  id: string,
  conversationId: string,
  direction: 'incoming' | 'outgoing',
  content: string,
  status: string,
  timestamp: string,
): ChatMessage {
  return {
    id,
    messageId: id,
    conversationId,
    direction,
    source: direction === 'incoming' ? 'customer' : 'admin',
    type: 'text',
    content,
    mediaUrl: null,
    mediaMimeType: null,
    mediaFilename: null,
    mediaSize: null,
    status,
    errorMessage: null,
    metadata: null,
    timestamp,
    createdAt: timestamp,
  };
}

const DUMMY_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-1',
    customerPhone: '+62 878-1234-5678',
    customerName: 'Budi Santoso',
    displayName: 'Budi Santoso',
    adminTakeover: false,
    lastMessageAt: minutesAgo(5),
    lastCustomerMessageAt: minutesAgo(5),
    unreadCount: 3,
    status: 'active',
    createdAt: hoursAgo(48),
    updatedAt: minutesAgo(5),
    canSendFreeform: true,
    freeformWindowEndsAt: hoursAgo(-19),
    phoneNumber: {
      id: 'pn-1a',
      displayPhoneNumber: '+62 812-3456-7890',
    },
    lastMessage: {
      id: 'msg-1-8',
      messageId: 'msg-1-8',
      conversationId: 'conv-1',
      direction: 'incoming',
      source: 'customer',
      type: 'text',
      content: 'Baik kak, ditunggu ya pengirimannya 🙏',
      mediaUrl: null,
      mediaMimeType: null,
      mediaFilename: null,
      mediaSize: null,
      status: 'delivered',
      errorMessage: null,
      metadata: null,
      timestamp: minutesAgo(5),
      createdAt: minutesAgo(5),
    },
  },
  {
    id: 'conv-2',
    customerPhone: '+62 856-9999-8888',
    customerName: 'Siti Rahayu',
    displayName: 'Siti Rahayu',
    adminTakeover: true,
    lastMessageAt: minutesAgo(30),
    lastCustomerMessageAt: minutesAgo(45),
    unreadCount: 1,
    status: 'active',
    createdAt: hoursAgo(72),
    updatedAt: minutesAgo(30),
    canSendFreeform: true,
    freeformWindowEndsAt: hoursAgo(-23),
    phoneNumber: {
      id: 'pn-1a',
      displayPhoneNumber: '+62 812-3456-7890',
    },
    lastMessage: {
      id: 'msg-2-6',
      messageId: 'msg-2-6',
      conversationId: 'conv-2',
      direction: 'incoming',
      source: 'customer',
      type: 'text',
      content: 'Apakah ada diskon untuk pembelian grosir?',
      mediaUrl: null,
      mediaMimeType: null,
      mediaFilename: null,
      mediaSize: null,
      status: 'delivered',
      errorMessage: null,
      metadata: null,
      timestamp: minutesAgo(30),
      createdAt: minutesAgo(30),
    },
  },
  {
    id: 'conv-3',
    customerPhone: '+62 877-5555-4444',
    customerName: 'Ahmad Wijaya',
    displayName: 'Ahmad Wijaya',
    adminTakeover: false,
    lastMessageAt: hoursAgo(2),
    lastCustomerMessageAt: hoursAgo(3),
    unreadCount: 0,
    status: 'active',
    createdAt: hoursAgo(96),
    updatedAt: hoursAgo(2),
    canSendFreeform: true,
    freeformWindowEndsAt: hoursAgo(-21),
    phoneNumber: {
      id: 'pn-1b',
      displayPhoneNumber: '+62 813-9876-5432',
    },
    lastMessage: {
      id: 'msg-3-5',
      messageId: 'msg-3-5',
      conversationId: 'conv-3',
      direction: 'outgoing',
      source: 'admin',
      type: 'text',
      content: 'Sudah kami proses ya pak, terima kasih 😊',
      mediaUrl: null,
      mediaMimeType: null,
      mediaFilename: null,
      mediaSize: null,
      status: 'read',
      errorMessage: null,
      metadata: null,
      timestamp: hoursAgo(2),
      createdAt: hoursAgo(2),
    },
  },
  {
    id: 'conv-4',
    customerPhone: '+62 838-7777-6666',
    customerName: null,
    displayName: '+62 838-7777-6666',
    adminTakeover: false,
    lastMessageAt: hoursAgo(6),
    lastCustomerMessageAt: hoursAgo(6),
    unreadCount: 0,
    status: 'active',
    createdAt: hoursAgo(24),
    updatedAt: hoursAgo(6),
    canSendFreeform: true,
    freeformWindowEndsAt: hoursAgo(-18),
    phoneNumber: {
      id: 'pn-1a',
      displayPhoneNumber: '+62 812-3456-7890',
    },
    lastMessage: {
      id: 'msg-4-4',
      messageId: 'msg-4-4',
      conversationId: 'conv-4',
      direction: 'outgoing',
      source: 'admin',
      type: 'text',
      content: 'Silakan hubungi kami lagi kalau ada pertanyaan',
      mediaUrl: null,
      mediaMimeType: null,
      mediaFilename: null,
      mediaSize: null,
      status: 'delivered',
      errorMessage: null,
      metadata: null,
      timestamp: hoursAgo(6),
      createdAt: hoursAgo(6),
    },
  },
  {
    id: 'conv-5',
    customerPhone: '+62 812-0000-1111',
    customerName: 'Dewi Lestari',
    displayName: 'Dewi Lestari',
    adminTakeover: false,
    lastMessageAt: hoursAgo(26),
    lastCustomerMessageAt: hoursAgo(26),
    unreadCount: 0,
    status: 'active',
    createdAt: hoursAgo(120),
    updatedAt: hoursAgo(26),
    canSendFreeform: false,
    freeformWindowEndsAt: hoursAgo(2),
    phoneNumber: {
      id: 'pn-1b',
      displayPhoneNumber: '+62 813-9876-5432',
    },
    lastMessage: {
      id: 'msg-5-3',
      messageId: 'msg-5-3',
      conversationId: 'conv-5',
      direction: 'incoming',
      source: 'customer',
      type: 'text',
      content: 'Ok terima kasih infonya',
      mediaUrl: null,
      mediaMimeType: null,
      mediaFilename: null,
      mediaSize: null,
      status: 'read',
      errorMessage: null,
      metadata: null,
      timestamp: hoursAgo(26),
      createdAt: hoursAgo(26),
    },
  },
  {
    id: 'conv-6',
    customerPhone: '+62 859-3333-2222',
    customerName: 'Rina Puspita',
    displayName: 'Rina Puspita',
    adminTakeover: false,
    lastMessageAt: minutesAgo(15),
    lastCustomerMessageAt: minutesAgo(15),
    unreadCount: 2,
    status: 'active',
    createdAt: hoursAgo(10),
    updatedAt: minutesAgo(15),
    canSendFreeform: true,
    freeformWindowEndsAt: hoursAgo(-23),
    phoneNumber: {
      id: 'pn-1a',
      displayPhoneNumber: '+62 812-3456-7890',
    },
    lastMessage: {
      id: 'msg-6-5',
      messageId: 'msg-6-5',
      conversationId: 'conv-6',
      direction: 'incoming',
      source: 'customer',
      type: 'text',
      content: 'Kak, barang yang kemarin sudah sampai belum ya?',
      mediaUrl: null,
      mediaMimeType: null,
      mediaFilename: null,
      mediaSize: null,
      status: 'delivered',
      errorMessage: null,
      metadata: null,
      timestamp: minutesAgo(15),
      createdAt: minutesAgo(15),
    },
  },
];

const DUMMY_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-1': [
    makeDummyMessage(
      'msg-1-1',
      'conv-1',
      'incoming',
      'Halo kak, saya mau tanya soal produk yang ada di katalog',
      'read',
      hoursAgo(4),
    ),
    makeDummyMessage(
      'msg-1-2',
      'conv-1',
      'outgoing',
      'Halo kak! Selamat datang di Toko Sinar Jaya 🌟\nSilakan tanya apa saja ya kak',
      'read',
      hoursAgo(3.5),
    ),
    makeDummyMessage(
      'msg-1-3',
      'conv-1',
      'incoming',
      'Produk kode SJ-001 masih ready stock kak?',
      'read',
      hoursAgo(3),
    ),
    makeDummyMessage(
      'msg-1-4',
      'conv-1',
      'outgoing',
      'Ready stock kak! Tersedia dalam warna putih, hitam, dan navy blue.\nMau pilih yang mana kak?',
      'read',
      hoursAgo(2.5),
    ),
    makeDummyMessage(
      'msg-1-5',
      'conv-1',
      'incoming',
      'Yang navy blue kak, mau pesan 3 pcs',
      'read',
      hoursAgo(2),
    ),
    makeDummyMessage(
      'msg-1-6',
      'conv-1',
      'outgoing',
      'Siap kak! Total harga 3 pcs Rp 450.000\nBisa transfer ke BCA 1234567890 a.n Toko Sinar Jaya',
      'read',
      hoursAgo(1),
    ),
    makeDummyMessage(
      'msg-1-7',
      'conv-1',
      'incoming',
      'Sudah transfer kak, ini buktinya',
      'delivered',
      minutesAgo(20),
    ),
    makeDummyMessage(
      'msg-1-8',
      'conv-1',
      'incoming',
      'Baik kak, ditunggu ya pengirimannya 🙏',
      'delivered',
      minutesAgo(5),
    ),
  ],
  'conv-2': [
    makeDummyMessage(
      'msg-2-1',
      'conv-2',
      'incoming',
      'Selamat siang, saya Siti dari CV Berkah Abadi',
      'read',
      hoursAgo(5),
    ),
    makeDummyMessage(
      'msg-2-2',
      'conv-2',
      'outgoing',
      'Selamat siang Bu Siti! Ada yang bisa kami bantu?',
      'read',
      hoursAgo(4.5),
    ),
    makeDummyMessage(
      'msg-2-3',
      'conv-2',
      'incoming',
      'Saya mau tanya harga untuk pembelian partai besar, minimal 100 pcs',
      'read',
      hoursAgo(4),
    ),
    makeDummyMessage(
      'msg-2-4',
      'conv-2',
      'outgoing',
      'Untuk pembelian 100 pcs keatas, kami berikan harga spesial Bu.\nSilakan kirimkan detail produk yang diminati ya',
      'read',
      hoursAgo(3),
    ),
    makeDummyMessage(
      'msg-2-5',
      'conv-2',
      'outgoing',
      'Kami juga bisa buatkan penawaran resmi jika diperlukan',
      'read',
      hoursAgo(2.5),
    ),
    makeDummyMessage(
      'msg-2-6',
      'conv-2',
      'incoming',
      'Apakah ada diskon untuk pembelian grosir?',
      'delivered',
      minutesAgo(30),
    ),
  ],
  'conv-3': [
    makeDummyMessage(
      'msg-3-1',
      'conv-3',
      'incoming',
      'Permisi pak, mau cek status pesanan no. ORD-88712',
      'read',
      hoursAgo(5),
    ),
    makeDummyMessage(
      'msg-3-2',
      'conv-3',
      'outgoing',
      'Sebentar ya pak, saya cek dulu',
      'read',
      hoursAgo(4.5),
    ),
    makeDummyMessage(
      'msg-3-3',
      'conv-3',
      'outgoing',
      'Pesanan ORD-88712 sudah dikirim via JNE dengan resi: JN1234567890\nEstimasi tiba 2-3 hari kerja',
      'read',
      hoursAgo(4),
    ),
    makeDummyMessage(
      'msg-3-4',
      'conv-3',
      'incoming',
      'Oke pak terima kasih banyak, saya track resinya ya',
      'read',
      hoursAgo(3),
    ),
    makeDummyMessage(
      'msg-3-5',
      'conv-3',
      'outgoing',
      'Sudah kami proses ya pak, terima kasih 😊',
      'read',
      hoursAgo(2),
    ),
  ],
  'conv-4': [
    makeDummyMessage(
      'msg-4-1',
      'conv-4',
      'incoming',
      'Halo, bisa minta info jam operasional tokonya?',
      'read',
      hoursAgo(8),
    ),
    makeDummyMessage(
      'msg-4-2',
      'conv-4',
      'outgoing',
      'Halo kak! Jam operasional kami:\nSenin-Jumat: 08.00 - 17.00 WIB\nSabtu: 08.00 - 14.00 WIB\nMinggu & tanggal merah: Tutup',
      'read',
      hoursAgo(7.5),
    ),
    makeDummyMessage(
      'msg-4-3',
      'conv-4',
      'incoming',
      'Oke noted, terima kasih',
      'read',
      hoursAgo(7),
    ),
    makeDummyMessage(
      'msg-4-4',
      'conv-4',
      'outgoing',
      'Silakan hubungi kami lagi kalau ada pertanyaan',
      'delivered',
      hoursAgo(6),
    ),
  ],
  'conv-5': [
    makeDummyMessage(
      'msg-5-1',
      'conv-5',
      'incoming',
      'Mba, barang yang saya pesan minggu lalu kok belum sampai ya?',
      'read',
      hoursAgo(30),
    ),
    makeDummyMessage(
      'msg-5-2',
      'conv-5',
      'outgoing',
      'Mohon maaf Bu Dewi, kami cek dulu ya status pengirimannya.\nBisa info nomor pesanannya?',
      'read',
      hoursAgo(28),
    ),
    makeDummyMessage(
      'msg-5-3',
      'conv-5',
      'incoming',
      'Ok terima kasih infonya',
      'read',
      hoursAgo(26),
    ),
  ],
  'conv-6': [
    makeDummyMessage(
      'msg-6-1',
      'conv-6',
      'incoming',
      'Halo kak, saya kemarin pesan 2 pcs mug custom',
      'read',
      hoursAgo(5),
    ),
    makeDummyMessage(
      'msg-6-2',
      'conv-6',
      'outgoing',
      'Halo Kak Rina! Iya benar, pesanannya sedang dalam proses produksi 🎨',
      'read',
      hoursAgo(4),
    ),
    makeDummyMessage(
      'msg-6-3',
      'conv-6',
      'incoming',
      'Kira-kira kapan selesai ya kak?',
      'read',
      hoursAgo(3),
    ),
    makeDummyMessage(
      'msg-6-4',
      'conv-6',
      'outgoing',
      'Estimasi 3 hari kerja kak, nanti kami kabarin kalau sudah selesai ya',
      'read',
      hoursAgo(2),
    ),
    makeDummyMessage(
      'msg-6-5',
      'conv-6',
      'incoming',
      'Kak, barang yang kemarin sudah sampai belum ya?',
      'delivered',
      minutesAgo(15),
    ),
  ],
};

// ──────────────────────────────────────────────
// Workspace Component
// ──────────────────────────────────────────────

export function ChatWorkspace() {
  // ── State ──
  const [activeWabaId, setActiveWabaId] = useState<string>(DUMMY_WABAS[0].id);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | undefined
  >(undefined);
  const [filter, setFilter] = useState<ChatSidebarFilter>('all');
  const [searchValue, setSearchValue] = useState('');
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<
    string | undefined
  >(undefined);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [contactDetailsByConversation, setContactDetailsByConversation] =
    useState<Record<string, { label: string; notes: string }>>({});
  const [extraMessages, setExtraMessages] = useState<
    Record<string, ChatMessage[]>
  >({});

  // ── Derived ──
  const activeWaba = DUMMY_WABAS.find((w) => w.id === activeWabaId);
  const phoneNumbers = activeWaba?.phoneNumbers ?? [];

  const filteredConversations = useMemo(() => {
    let result = DUMMY_CONVERSATIONS;

    // Filter by phone number
    if (selectedPhoneNumberId) {
      result = result.filter((c) => c.phoneNumber.id === selectedPhoneNumberId);
    }

    // Filter by unread
    if (filter === 'unread') {
      result = result.filter((c) => c.unreadCount > 0);
    }

    // Search
    const q = searchValue.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.customerPhone.toLowerCase().includes(q),
      );
    }

    return result;
  }, [filter, searchValue, selectedPhoneNumberId]);

  const allCount = useMemo(() => {
    let result = DUMMY_CONVERSATIONS;
    if (selectedPhoneNumberId) {
      result = result.filter((c) => c.phoneNumber.id === selectedPhoneNumberId);
    }
    const q = searchValue.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.customerPhone.toLowerCase().includes(q),
      );
    }
    return result.length;
  }, [searchValue, selectedPhoneNumberId]);

  const unreadCount = useMemo(() => {
    let result = DUMMY_CONVERSATIONS.filter((c) => c.unreadCount > 0);
    if (selectedPhoneNumberId) {
      result = result.filter((c) => c.phoneNumber.id === selectedPhoneNumberId);
    }
    const q = searchValue.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.customerPhone.toLowerCase().includes(q),
      );
    }
    return result.length;
  }, [searchValue, selectedPhoneNumberId]);

  const selectedConversation = selectedConversationId
    ? DUMMY_CONVERSATIONS.find((c) => c.id === selectedConversationId)
    : undefined;

  const messages = useMemo(() => {
    if (!selectedConversationId) return [];
    const base = DUMMY_MESSAGES[selectedConversationId] ?? [];
    const extra = extraMessages[selectedConversationId] ?? [];
    return [...base, ...extra];
  }, [selectedConversationId, extraMessages]);

  const selectedContactDraft = selectedConversation
    ? (contactDetailsByConversation[selectedConversation.id] ?? {
        label: '',
        notes: '',
      })
    : { label: '', notes: '' };

  const showMobileDetail = Boolean(selectedConversationId);

  // ── Handlers ──
  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsContactInfoOpen(false);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversationId) return;

      const newMessage: ChatMessage = {
        id: `user-msg-${Date.now()}`,
        messageId: `user-msg-${Date.now()}`,
        conversationId: selectedConversationId,
        direction: 'outgoing',
        source: 'admin',
        type: 'text',
        content,
        mediaUrl: null,
        mediaMimeType: null,
        mediaFilename: null,
        mediaSize: null,
        status: 'sent',
        errorMessage: null,
        metadata: null,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setExtraMessages((prev) => ({
        ...prev,
        [selectedConversationId]: [
          ...(prev[selectedConversationId] ?? []),
          newMessage,
        ],
      }));
    },
    [selectedConversationId],
  );

  // ── Render ──
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 bg-background z-10 relative border-b border-brand/15">
        <div className="flex h-15 items-center px-4">
          <WabaSwitcher
            wabas={DUMMY_WABAS}
            activeWabaId={activeWaba?.id}
            onSelectWaba={(wabaId) => {
              setActiveWabaId(wabaId);
              setSelectedConversationId(undefined);
              setSelectedPhoneNumberId(undefined);
            }}
          />
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 overflow-hidden bg-background"
        style={{ contain: 'strict' }}
      >
        {/* Sidebar */}
        <div
          className={`absolute inset-0 z-10 flex h-full w-full flex-col bg-background transition-transform duration-200 ease-out lg:static lg:w-95 lg:shrink-0 lg:border-r lg:border-brand/10 lg:translate-x-0 ${showMobileDetail ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
        >
          <ChatSidebar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            filter={filter}
            onFilterChange={setFilter}
            phoneNumbers={phoneNumbers}
            selectedPhoneNumberId={selectedPhoneNumberId}
            onPhoneNumberChange={setSelectedPhoneNumberId}
            conversations={filteredConversations}
            activeConversationId={selectedConversationId}
            isLoading={false}
            isError={false}
            hasNextPage={false}
            isFetchingNextPage={false}
            onLoadMore={() => {}}
            onRetry={() => {}}
            onSelectConversation={handleSelectConversation}
            allCount={allCount}
            unreadCount={unreadCount}
          />
        </div>

        {/* Chat Detail */}
        <div
          className={`absolute inset-0 z-20 flex min-w-0 flex-1 flex-col bg-background transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 ${!showMobileDetail ? 'translate-x-full pointer-events-none' : isContactInfoOpen ? '-translate-x-full pointer-events-none lg:pointer-events-auto' : 'translate-x-0'}`}
        >
          {selectedConversation ? (
            <ChatDetail
              conversation={selectedConversation}
              messages={messages}
              isLoading={false}
              hasNextPage={false}
              isFetchingNextPage={false}
              onLoadOlder={() => {}}
              isSending={false}
              onSend={handleSendMessage}
              showBackButton={showMobileDetail}
              onBack={() => {
                setSelectedConversationId(undefined);
              }}
              onContactAreaClick={() => {
                setIsContactInfoOpen((prev) => !prev);
              }}
            />
          ) : (
            <div className="flex h-full flex-1 items-center justify-center bg-brand/5">
              <ChatEmptyState
                title="Belum ada chat dipilih"
                description="Pilih percakapan dari sidebar untuk melihat riwayat pesan."
                icon={InboxIcon}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Contact Info Panel */}
        {selectedConversation && isContactInfoOpen ? (
          <div className="absolute inset-0 z-30 flex flex-col bg-background lg:static lg:z-0 lg:w-95 lg:shrink-0 lg:overflow-hidden lg:border-l lg:border-brand/10">
            <ContactInfoPanel
              conversation={selectedConversation}
              label={selectedContactDraft.label}
              notes={selectedContactDraft.notes}
              onLabelChange={(value) => {
                setContactDetailsByConversation((prev) => ({
                  ...prev,
                  [selectedConversation.id]: {
                    ...selectedContactDraft,
                    label: value,
                  },
                }));
              }}
              onNotesChange={(value) => {
                setContactDetailsByConversation((prev) => ({
                  ...prev,
                  [selectedConversation.id]: {
                    ...selectedContactDraft,
                    notes: value,
                  },
                }));
              }}
              onClose={() => {
                setIsContactInfoOpen(false);
              }}
              showMobileBackButton={showMobileDetail}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
