import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Ma'lumotlarni yuklashda xatolik yuz berdi", onRetry }: ErrorStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="text-red-500" size={32} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Xatolik yuz berdi</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{message}</p>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={16} />
          Qayta urinish
        </button>
      )}
    </div>
  );
}
