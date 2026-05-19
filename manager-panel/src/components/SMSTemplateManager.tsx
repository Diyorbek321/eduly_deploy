import React, { useState } from 'react';
import { Plus, Edit2, Trash2, MessageSquare, Type } from 'lucide-react';
import { Modal } from './Modal';

export interface SMSTemplate {
  id: string;
  title: string;
  content: string;
}

interface SMSTemplateManagerProps {
  templates: SMSTemplate[];
  onSave: (template: SMSTemplate) => void;
  onDelete: (id: string) => void;
}

export const SMSTemplateManager: React.FC<SMSTemplateManagerProps> = ({ templates, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormData({ title: '', content: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setFormData({ title: template.title, content: template.content });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Haqiqatan ham bu shablonni o\'chirmoqchimisiz?')) {
      onDelete(id);
    }
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) return;
    
    onSave({
      id: editingTemplate ? editingTemplate.id : Math.random().toString(36).substr(2, 9),
      title: formData.title,
      content: formData.content
    });
    setIsModalOpen(false);
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + placeholder
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">SMS Shablonlar</h3>
          <p className="text-sm text-slate-500 font-medium">Tez-tez yuboriladigan xabarlar uchun tayyor matnlar</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95 text-sm"
        >
          <Plus size={18} />
          <span>+ Shablon qo'shish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="size-12 bg-orange-50 text-[#ec5b13] rounded-2xl flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(template)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(template.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h4 className="text-lg font-black text-slate-900 mb-2">{template.title}</h4>
            <p className="text-sm text-slate-600 font-medium line-clamp-4 flex-1">
              {template.content}
            </p>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? "Shablonni tahrirlash" : "Yangi shablon yaratish"}
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Bekor qilish</button>
            <button onClick={handleSave} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">Saqlash</button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase">Shablon nomi</label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-sm" 
                placeholder="Masalan: Qarzdorlik eslatmasi" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-400 uppercase">Xabar matni</label>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center mr-2">O'zgaruvchilar:</span>
              {[
                { label: 'O\'quvchi ismi', tag: '[Ism]' },
                { label: 'Summa', tag: '[Summa]' },
                { label: 'Sana', tag: '[Sana]' },
                { label: 'Vaqt', tag: '[Vaqt]' },
                { label: 'Guruh', tag: '[Guruh]' }
              ].map(v => (
                <button
                  key={v.tag}
                  onClick={() => insertPlaceholder(v.tag)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                  title={`${v.label} qo'shish`}
                >
                  {v.tag}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea 
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none font-medium text-sm resize-none h-40" 
                placeholder="Hurmatli ota-ona, farzandingiz [Ism]ning oylik to'lovidan [Summa] so'm qarzdorligi mavjud..." 
              />
              <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400">
                {formData.content.length} / 160 belgi
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
