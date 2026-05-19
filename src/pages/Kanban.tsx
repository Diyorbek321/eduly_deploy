import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Loader2, Trash2, ChevronLeft, ChevronRight,
  Calendar, MoreVertical, Edit3, Kanban as KanbanIcon,
  AlertTriangle, ArrowRight,
} from 'lucide-react';
import { Header } from '@/src/components/Header';
import api from '@/src/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface KanbanCard {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  priority: string;
  assignee_name: string | null;
  created_at: string;
}

interface KanbanColumn {
  id: number;
  board_id: number;
  title: string;
  color: string;
  position: number;
  card_limit: number | null;
  cards: KanbanCard[];
}

interface KanbanBoard {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  columns: KanbanColumn[];
}

interface BoardSummary {
  id: number;
  title: string;
  description: string | null;
  column_count: number;
  card_count: number;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  low:    { label: 'Past',      cls: 'bg-slate-100 text-slate-500' },
  normal: { label: 'Oddiy',     cls: 'bg-sky-100 text-sky-600' },
  high:   { label: 'Yuqori',    cls: 'bg-amber-100 text-amber-700' },
  urgent: { label: 'Shoshilinch', cls: 'bg-rose-100 text-rose-600' },
};

// ─── Card Item ───────────────────────────────────────────────────────────────

function CardItem({
  card, columns, onMoved, onEdit, onDelete,
}: {
  card: KanbanCard;
  columns: KanbanColumn[];
  onMoved: (cardId: number, toColumnId: number) => void;
  onEdit: (c: KanbanCard) => void;
  onDelete: (c: KanbanCard) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const p = PRIORITY_STYLES[card.priority] ?? PRIORITY_STYLES.normal;

  const isOverdue = card.due_date && new Date(card.due_date) < new Date();
  const colIdx = columns.findIndex(c => c.id === card.column_id);
  const prevCol = colIdx > 0 ? columns[colIdx - 1] : null;
  const nextCol = colIdx < columns.length - 1 ? columns[colIdx + 1] : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 group hover:shadow-md transition-all">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-bold text-slate-900 leading-snug">{card.title}</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="size-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition-all"
          >
            <MoreVertical size={13} className="text-slate-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20" onMouseLeave={() => setMenuOpen(false)}>
              <button type="button" onClick={() => { onEdit(card); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                <Edit3 size={12} /> Tahrirlash
              </button>
              <button type="button" onClick={() => { onDelete(card); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">
                <Trash2 size={12} /> O'chirish
              </button>
            </div>
          )}
        </div>
      </div>

      {card.description && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{card.description}</p>
      )}

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.cls}`}>{p.label}</span>
        {card.due_date && (
          <span className={`flex items-center gap-1 text-[10px] font-medium ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
            {isOverdue && <AlertTriangle size={10} />}
            <Calendar size={10} />
            {new Date(card.due_date).toLocaleDateString('uz-UZ')}
          </span>
        )}
      </div>

      {/* Move buttons */}
      <div className="flex items-center gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {prevCol && (
          <button
            type="button"
            onClick={() => onMoved(card.id, prevCol.id)}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200"
            title={`← ${prevCol.title}`}
          >
            <ChevronLeft size={11} />
            {prevCol.title.slice(0, 8)}
          </button>
        )}
        <div className="flex-1" />
        {nextCol && (
          <button
            type="button"
            onClick={() => onMoved(card.id, nextCol.id)}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200"
            title={`${nextCol.title} →`}
          >
            {nextCol.title.slice(0, 8)}
            <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Column component ─────────────────────────────────────────────────────────

function BoardColumn({
  col, columns, onAddCard, onCardMoved, onEditCard, onDeleteCard, onDeleteCol,
}: {
  col: KanbanColumn;
  columns: KanbanColumn[];
  onAddCard: (colId: number) => void;
  onCardMoved: (cardId: number, toColumnId: number) => void;
  onEditCard: (c: KanbanCard) => void;
  onDeleteCard: (c: KanbanCard) => void;
  onDeleteCol: (col: KanbanColumn) => void;
}) {
  const atLimit = col.card_limit !== null && col.cards.length >= col.card_limit;

  return (
    <div className="flex-1 min-w-[220px] max-w-xs flex flex-col bg-slate-100/80 rounded-2xl">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="size-3 rounded-full flex-shrink-0" style={{ background: col.color }} />
        <span className="text-xs font-black text-slate-800 flex-1 truncate">{col.title}</span>
        <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
          {col.cards.length}{col.card_limit ? `/${col.card_limit}` : ''}
        </span>
        <button
          type="button"
          onClick={() => onAddCard(col.id)}
          disabled={atLimit}
          className="size-6 rounded-lg flex items-center justify-center hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
        >
          <Plus size={13} />
        </button>
        <button
          type="button"
          onClick={() => onDeleteCol(col)}
          className="size-6 rounded-lg flex items-center justify-center hover:bg-rose-50 text-slate-300 hover:text-rose-400 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[520px] min-h-[80px]">
        {col.cards.map(card => (
          <CardItem
            key={card.id}
            card={card}
            columns={columns}
            onMoved={onCardMoved}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
          />
        ))}
        {col.cards.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            Bo'sh
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card Modal ───────────────────────────────────────────────────────────────

function CardModal({
  card, columnId, onClose, onSaved, onDeleted,
}: {
  card: KanbanCard | null;
  columnId: number;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [title, setTitle] = useState(card?.title ?? '');
  const [desc, setDesc] = useState(card?.description ?? '');
  const [dueDate, setDueDate] = useState(card?.due_date?.slice(0, 10) ?? '');
  const [priority, setPriority] = useState(card?.priority ?? 'normal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) { setError("Sarlavha majburiy"); return; }
    setSaving(true); setError('');
    try {
      const payload = { title, description: desc || null, due_date: dueDate || null, priority };
      if (card) {
        await api.patch(`/kanban/cards/${card.id}`, payload);
      } else {
        await api.post(`/kanban/columns/${columnId}/cards`, payload);
      }
      onSaved();
      onClose();
    } catch {
      setError('Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!card || !onDeleted) return;
    await api.delete(`/kanban/cards/${card.id}`);
    onDeleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">{card ? 'Kartani tahrirlash' : 'Yangi karta'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Sarlavha *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tavsif</label>
            <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Muddat</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Muhimlik</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20">
                {Object.entries(PRIORITY_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
          {card && onDeleted && (
            <button type="button" onClick={remove}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50">
              <Trash2 size={12} /> O'chirish
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Bekor</button>
          <button type="button" onClick={save} disabled={saving}
            className="px-4 py-2 text-sm font-bold text-white bg-[#ec5b13] rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Board list page ──────────────────────────────────────────────────────────

function BoardList({ onSelect }: { onSelect: (b: BoardSummary) => void }) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kanban/boards');
      setBoards(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBoard = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.post('/kanban/boards', { title: newTitle, description: newDesc || null });
      setNewTitle(''); setNewDesc(''); setCreating(false);
      load();
    } catch { /* handled by interceptor */ }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Kanban taxtalar</h2>
          <p className="text-sm text-slate-400 mt-0.5">{boards.length} ta taxta</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ec5b13] text-white text-sm font-bold rounded-xl hover:bg-orange-600"
        >
          <Plus size={15} /> Yangi taxta
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <KanbanIcon size={40} />
          <p className="font-bold">Hali taxta yo'q</p>
          <button type="button" onClick={() => setCreating(true)}
            className="text-sm text-[#ec5b13] font-bold hover:underline">Birinchi taxtani yarating</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {boards.map(b => (
            <div
              key={b.id}
              onClick={() => onSelect(b)}
              className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <KanbanIcon size={20} className="text-[#ec5b13]" />
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-[#ec5b13] transition-colors" />
              </div>
              <h3 className="font-black text-slate-900 mb-1">{b.title}</h3>
              {b.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{b.description}</p>}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="font-bold">{b.column_count} ustun</span>
                <span>·</span>
                <span className="font-bold">{b.card_count} karta</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-black text-slate-900 mb-4">Yangi taxta</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Sarlavha *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Masalan: Marketing vazifalari"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tavsif</label>
                <textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setCreating(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Bekor</button>
              <button type="button" onClick={createBoard}
                className="flex-1 py-2.5 bg-[#ec5b13] text-white rounded-xl text-sm font-bold hover:bg-orange-600">Yaratish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Board view ───────────────────────────────────────────────────────────────

function BoardView({ boardId, onBack }: { boardId: number; onBack: () => void }) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardModal, setCardModal] = useState<{ card: KanbanCard | null; columnId: number } | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/kanban/boards/${boardId}`);
      setBoard(res.data?.data ?? res.data);
    } finally { setLoading(false); }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  const addColumn = async () => {
    if (!newColTitle.trim()) return;
    await api.post(`/kanban/boards/${boardId}/columns`, { title: newColTitle });
    setNewColTitle(''); setAddingCol(false);
    load();
  };

  const deleteColumn = async (col: KanbanColumn) => {
    if (!confirm(`"${col.title}" ustunini o'chirish?`)) return;
    await api.delete(`/kanban/columns/${col.id}`);
    load();
  };

  const moveCard = async (cardId: number, toColumnId: number) => {
    await api.patch(`/kanban/cards/${cardId}`, { column_id: toColumnId });
    load();
  };

  const deleteCard = async (card: KanbanCard) => {
    await api.delete(`/kanban/cards/${card.id}`);
    load();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Board header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ChevronLeft size={16} /> Taxtalar
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <h2 className="text-base font-black text-slate-900">{board.title}</h2>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setAddingCol(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          <Plus size={13} /> Ustun
        </button>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto p-4 md:p-6">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {board.columns.map(col => (
            <BoardColumn
              key={col.id}
              col={col}
              columns={board.columns}
              onAddCard={colId => setCardModal({ card: null, columnId: colId })}
              onCardMoved={moveCard}
              onEditCard={c => setCardModal({ card: c, columnId: c.column_id })}
              onDeleteCard={deleteCard}
              onDeleteCol={deleteColumn}
            />
          ))}

          {/* Add column inline button */}
          {addingCol ? (
            <div className="min-w-[220px] bg-slate-100 rounded-2xl p-3 flex flex-col gap-2">
              <input
                autoFocus
                value={newColTitle}
                onChange={e => setNewColTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') { setAddingCol(false); setNewColTitle(''); } }}
                placeholder="Ustun nomi..."
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 bg-white"
              />
              <div className="flex gap-2">
                <button type="button" onClick={addColumn}
                  className="flex-1 py-1.5 bg-[#ec5b13] text-white text-xs font-bold rounded-lg hover:bg-orange-600">Qo'shish</button>
                <button type="button" onClick={() => { setAddingCol(false); setNewColTitle(''); }}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg hover:bg-white">
                  <X size={12} className="text-slate-400" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCol(true)}
              className="min-w-[48px] h-12 self-start flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-[#ec5b13] hover:text-[#ec5b13] transition-colors"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {cardModal && (
        <CardModal
          card={cardModal.card}
          columnId={cardModal.columnId}
          onClose={() => setCardModal(null)}
          onSaved={load}
          onDeleted={load}
        />
      )}
    </div>
  );
}

// ─── Main Kanban page ─────────────────────────────────────────────────────────

export const Kanban = () => {
  const [selectedBoard, setSelectedBoard] = useState<BoardSummary | null>(null);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
      <Header title={selectedBoard ? selectedBoard.title : 'Kanban'} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedBoard ? (
          <BoardView boardId={selectedBoard.id} onBack={() => setSelectedBoard(null)} />
        ) : (
          <BoardList onSelect={setSelectedBoard} />
        )}
      </div>
    </div>
  );
};
