import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Send, 
  Paperclip, 
  Users, 
  UserPlus,
  MessageCircle,
  MoreVertical,
  Info
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import { cn } from '@/src/lib/utils';
import { Modal } from '@/src/components/Modal';

interface ChatMember {
  id: string;
  name: string;
  role: 'O\'qituvchi' | 'O\'quvchi' | 'Admin';
  avatar?: string;
}

interface GroupChat {
  id: string;
  name: string;
  members: ChatMember[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  time: string;
  isMe: boolean;
}

const initialChats: GroupChat[] = [
  {
    id: 'c1',
    name: 'English IELTS #12',
    members: [
      { id: 't1', name: 'Alisher Navoiy', role: 'O\'qituvchi' },
      { id: 's1', name: 'Alisher Sadullayev', role: 'O\'quvchi' },
      { id: 's2', name: 'Javohir Orifov', role: 'O\'quvchi' },
    ],
    lastMessage: 'Ertaga dars soat 14:00 da boshlanadi.',
    lastMessageTime: '10:30',
    unreadCount: 2
  },
  {
    id: 'c2',
    name: 'Foundation #4',
    members: [
      { id: 't2', name: 'Malika Ahmedova', role: 'O\'qituvchi' },
      { id: 's3', name: 'Malika Karimova', role: 'O\'quvchi' },
    ],
    lastMessage: 'Uyga vazifalarni tekshirdim.',
    lastMessageTime: 'Kecha',
    unreadCount: 0
  }
];

const initialMessages: ChatMessage[] = [
  { id: 'm1', chatId: 'c1', senderId: 't1', senderName: 'Alisher Navoiy', senderRole: 'O\'qituvchi', text: 'Assalomu alaykum hurmatli o\'quvchilar!', time: '10:00', isMe: false },
  { id: 'm2', chatId: 'c1', senderId: 's1', senderName: 'Alisher Sadullayev', senderRole: 'O\'quvchi', text: 'Va alaykum assalom ustoz.', time: '10:05', isMe: false },
  { id: 'm3', chatId: 'c1', senderId: 'admin', senderName: 'Admin', senderRole: 'Admin', text: 'Barchaga muvaffaqiyat!', time: '10:15', isMe: true },
  { id: 'm4', chatId: 'c1', senderId: 't1', senderName: 'Alisher Navoiy', senderRole: 'O\'qituvchi', text: 'Ertaga dars soat 14:00 da boshlanadi.', time: '10:30', isMe: false },
];

export const Chat = () => {
  const [chats, setChats] = useState<GroupChat[]>(initialChats);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [activeChatId, setActiveChatId] = useState<string | null>('c1');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const [newChatName, setNewChatName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'O\'qituvchi' | 'O\'quvchi'>('O\'quvchi');

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = messages.filter(m => m.chatId === activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      chatId: activeChatId,
      senderId: 'admin',
      senderName: 'Admin',
      senderRole: 'Admin',
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };

    setMessages(prev => [...prev, newMsg]);
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, lastMessage: newMsg.text, lastMessageTime: newMsg.time } : c));
    setNewMessage('');
  };

  const handleCreateChat = () => {
    if (!newChatName.trim()) return;
    const newChat: GroupChat = {
      id: Math.random().toString(),
      name: newChatName.trim(),
      members: [{ id: 'admin', name: 'Admin', role: 'Admin' }],
      unreadCount: 0
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setNewChatName('');
    setIsNewChatModalOpen(false);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim() || !activeChatId) return;
    
    const newMember: ChatMember = {
      id: Math.random().toString(),
      name: newMemberName.trim(),
      role: newMemberRole
    };

    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return { ...c, members: [...c.members, newMember] };
      }
      return c;
    }));

    setNewMemberName('');
    setIsAddMemberModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
      <Header />
      
      <main className="flex-1 flex overflow-hidden max-w-[1440px] mx-auto w-full p-4 md:p-6 lg:p-8 gap-6">
        
        {/* Sidebar: Chat List */}
        <div className={cn(
          "w-full md:w-80 lg:w-96 flex-shrink-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all",
          activeChatId ? "hidden md:flex" : "flex"
        )}>
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Guruh chatlari</h2>
              <button 
                onClick={() => setIsNewChatModalOpen(true)}
                className="size-10 bg-orange-50 text-[#ec5b13] hover:bg-[#ec5b13] hover:text-white rounded-xl flex items-center justify-center transition-colors"
                title="Yangi chat yaratish"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Chat qidirish..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-left",
                  activeChatId === chat.id 
                    ? "bg-[#ec5b13] text-white shadow-md shadow-orange-200" 
                    : "hover:bg-slate-50 text-slate-900"
                )}
              >
                <div className={cn(
                  "size-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg",
                  activeChatId === chat.id ? "bg-white/20 text-white" : "bg-orange-50 text-[#ec5b13]"
                )}>
                  {chat.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={cn("text-sm font-black truncate", activeChatId === chat.id ? "text-white" : "text-slate-900")}>
                      {chat.name}
                    </h4>
                    {chat.lastMessageTime && (
                      <span className={cn("text-[10px] font-bold", activeChatId === chat.id ? "text-white/70" : "text-slate-400")}>
                        {chat.lastMessageTime}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn("text-xs truncate font-medium", activeChatId === chat.id ? "text-white/80" : "text-slate-500")}>
                      {chat.lastMessage || 'Xabarlar yo\'q'}
                    </p>
                    {chat.unreadCount > 0 && activeChatId !== chat.id && (
                      <span className="size-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={cn(
          "flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all relative",
          !activeChatId ? "hidden md:flex items-center justify-center bg-slate-50/50" : "flex"
        )}>
          {!activeChatId ? (
            <div className="text-center space-y-4">
              <div className="size-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-300">
                <MessageCircle size={40} />
              </div>
              <p className="text-slate-500 font-bold">Chatni boshlash uchun guruhni tanlang</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-20 border-b border-slate-100 px-6 flex items-center justify-between bg-white flex-shrink-0 z-10">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveChatId(null)}
                    className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600"
                  >
                    <Search size={20} /> {/* Using search as back icon placeholder if arrow not available, but let's just use a simple text or hide it. Actually, better to just let them click a back button. Let's use a generic back approach or just rely on desktop view for now. */}
                  </button>
                  <div className="size-12 rounded-xl bg-orange-50 text-[#ec5b13] flex items-center justify-center font-black text-lg">
                    {activeChat?.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{activeChat?.name}</h3>
                    <p className="text-xs font-bold text-slate-500">{activeChat?.members.length} ta a'zo</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="p-2.5 text-slate-400 hover:text-[#ec5b13] hover:bg-orange-50 rounded-xl transition-colors"
                    title="A'zo qo'shish"
                  >
                    <UserPlus size={20} />
                  </button>
                  <button 
                    onClick={() => setIsGroupInfoOpen(!isGroupInfoOpen)}
                    className={cn(
                      "p-2.5 rounded-xl transition-colors",
                      isGroupInfoOpen ? "text-[#ec5b13] bg-orange-50" : "text-slate-400 hover:text-[#ec5b13] hover:bg-orange-50"
                    )}
                    title="Guruh ma'lumotlari"
                  >
                    <Info size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Messages Area */}
                <div className="flex-1 flex flex-col bg-slate-50/50">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeMessages.map((msg, idx) => {
                      const showHeader = idx === 0 || activeMessages[idx - 1].senderId !== msg.senderId;
                      return (
                        <div key={msg.id} className={cn("flex flex-col", msg.isMe ? "items-end" : "items-start")}>
                          {showHeader && !msg.isMe && (
                            <div className="flex items-baseline gap-2 mb-1 ml-1">
                              <span className="text-xs font-black text-slate-700">{msg.senderName}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{msg.senderRole}</span>
                            </div>
                          )}
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-5 py-3 relative group",
                            msg.isMe 
                              ? "bg-[#ec5b13] text-white rounded-tr-sm" 
                              : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                          )}>
                            <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                            <span className={cn(
                              "text-[10px] font-bold mt-2 block text-right",
                              msg.isMe ? "text-white/70" : "text-slate-400"
                            )}>
                              {msg.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 bg-white border-t border-slate-100">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                      <button type="button" className="p-3 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                        <Paperclip size={20} />
                      </button>
                      <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
                        <textarea 
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Xabar yozing..."
                          className="w-full bg-transparent border-none px-4 py-3 outline-none text-sm font-medium resize-none max-h-32 min-h-[44px]"
                          rows={1}
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-3 bg-[#ec5b13] text-white rounded-2xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-md shadow-orange-200"
                      >
                        <Send size={20} />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Group Info Sidebar (Collapsible) */}
                {isGroupInfoOpen && (
                  <div className="w-72 border-l border-slate-100 bg-white flex flex-col flex-shrink-0">
                    <div className="p-6 border-b border-slate-100">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Guruh a'zolari</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Group by role */}
                      {['O\'qituvchi', 'Admin', 'O\'quvchi'].map(role => {
                        const roleMembers = activeChat?.members.filter(m => m.role === role) || [];
                        if (roleMembers.length === 0) return null;
                        return (
                          <div key={role} className="space-y-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-2">{role}lar</h4>
                            {roleMembers.map(member => (
                              <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="text-sm font-bold text-slate-700 truncate">{member.name}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* New Chat Modal */}
      <Modal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        title="Yangi guruh chati"
        footer={
          <>
            <button onClick={() => setIsNewChatModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleCreateChat} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Yaratish</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Guruh nomi</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={newChatName}
                onChange={e => setNewChatName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                placeholder="Masalan: Backend Pro #1" 
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="A'zo qo'shish"
        footer={
          <>
            <button onClick={() => setIsAddMemberModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleAddMember} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Qo'shish</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Ismi sharifi</label>
            <input 
              type="text" 
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
              placeholder="O'quvchi yoki o'qituvchi ismi" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Roli</label>
            <select 
              value={newMemberRole}
              onChange={e => setNewMemberRole(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm cursor-pointer"
            >
              <option value="O'quvchi">O'quvchi</option>
              <option value="O'qituvchi">O'qituvchi</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};
