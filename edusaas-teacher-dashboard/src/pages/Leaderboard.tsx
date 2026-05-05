import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface Stats {
  groups: Array<{ id: number; name: string; students_count: number; capacity: number }>;
}

interface Student {
  id: number;
  name: string;
  phone: string | null;
  avatar: string | null;
  status: string;
}

interface Row {
  student: Student;
  group: string;
  groupId: number;
}

export function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [groups, setGroups] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await api.get<Stats>('/teacher/stats');
      setGroups(statsRes.data.groups.map((g) => ({ id: g.id, name: g.name })));

      const allRows: Row[] = [];
      for (const g of statsRes.data.groups) {
        try {
          const sRes = await api.get<Student[]>(`/teacher/my-groups/${g.id}/students`);
          sRes.data.forEach((s) => allRows.push({ student: s, group: g.name, groupId: g.id }));
        } catch {
          // skip
        }
      }
      setRows(allRows);
    } catch (err: any) {
      setError(err.message || 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const filtered = selectedGroup === 'all' ? rows : rows.filter((r) => r.groupId === Number(selectedGroup));
  const sorted = [...filtered].sort((a, b) => a.student.name.localeCompare(b.student.name));

  const medal = (idx: number) => {
    if (idx === 0) return <Trophy className="text-amber-500" size={20} />;
    if (idx === 1) return <Medal className="text-slate-400" size={20} />;
    if (idx === 2) return <Award className="text-orange-400" size={20} />;
    return <span className="text-slate-400 font-black w-5 text-center">{idx + 1}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ec5b13]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="font-bold">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-[#ec5b13] text-white rounded-xl font-bold">
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Reyting</h1>
          <p className="text-slate-500 mt-1">O'quvchilar ro'yxati ({sorted.length} ta)</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={16} />Yangilash
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedGroup('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold",
            selectedGroup === 'all' ? "bg-[#ec5b13] text-white" : "bg-white border border-slate-200 text-slate-600"
          )}
        >
          Barcha ({rows.length})
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGroup(String(g.id))}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold",
              selectedGroup === String(g.id) ? "bg-[#ec5b13] text-white" : "bg-white border border-slate-200 text-slate-600"
            )}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-center py-12 text-slate-400">O'quvchilar topilmadi</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sorted.map((row, idx) => (
              <div key={`${row.groupId}-${row.student.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                <div className="flex items-center justify-center w-8">{medal(idx)}</div>
                <img
                  src={row.student.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${row.student.name}`}
                  alt={row.student.name}
                  className="size-10 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{row.student.name}</p>
                  <p className="text-xs text-slate-500 truncate">{row.group} • {row.student.phone || '—'}</p>
                </div>
                <span className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg",
                  row.student.status === 'Faol' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                )}>
                  {row.student.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
