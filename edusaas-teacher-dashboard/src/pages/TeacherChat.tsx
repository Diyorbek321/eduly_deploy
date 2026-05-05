import React from 'react';
import { MessageCircle } from 'lucide-react';

export function TeacherChat() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-24 rounded-3xl bg-orange-50 flex items-center justify-center mb-6">
        <MessageCircle className="w-12 h-12 text-[#ec5b13]" />
      </div>
      <h1 className="text-3xl font-black text-slate-900">Chat</h1>
      <p className="text-slate-500 mt-2 max-w-md">
        Chat funksiyasi hozircha ishlab chiqilmoqda. Yaqin kunlarda siz o'quvchilar va admin bilan yozishish imkoniyatiga ega bo'lasiz.
      </p>
      <span className="mt-6 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold">
        Tez orada
      </span>
    </div>
  );
}
