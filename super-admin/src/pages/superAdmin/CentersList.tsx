/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit2, 
  Settings, 
  Trash2,
  Lock,
  Unlock,
  Users,
  GraduationCap
} from "lucide-react";
import { superAdminApi } from "../../lib/superAdminApi";
import { EducationCenter } from "../../types";
import { formatDate } from "../../lib/utils";
import StatusBadge from "../../components/superAdmin/StatusBadge";
import PlanBadge from "../../components/superAdmin/PlanBadge";
import CreateCenterModal from "../../components/superAdmin/CreateCenterModal";
import ConfirmDialog from "../../components/superAdmin/ConfirmDialog";
import { useNavigate } from "react-router-dom";

export default function CentersList() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState<EducationCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<EducationCenter | null>(null);

  useEffect(() => {
    fetchCenters();
  }, []);

  async function fetchCenters() {
    setIsLoading(true);
    try {
      const data = await superAdminApi.getCenters();
      setCenters(data);
    } catch (error) {
      console.error("Fetch centers error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreateCenter = async (data: any) => {
    try {
      await superAdminApi.createCenter(data);
      setIsCreateModalOpen(false);
      fetchCenters();
    } catch (error) {
      console.error("Create center error:", error);
    }
  };

  const handleDeleteCenter = async () => {
    if (selectedCenter) {
      try {
        await superAdminApi.deleteCenter(selectedCenter.id);
        fetchCenters();
      } catch (error) {
        console.error("Delete center error:", error);
      }
    }
  };

  const toggleCenterStatus = async (center: EducationCenter) => {
    try {
      if (center.status === "Faol") {
        await superAdminApi.suspendCenter(center.id);
      } else {
        await superAdminApi.activateCenter(center.id);
      }
      fetchCenters();
    } catch (error) {
      console.error("Toggle status error:", error);
    }
  };

  const filteredCenters = centers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">O'quv markazlari</h2>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tizimdagi barcha markazlar ro'yxati</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Yangi markaz
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Qidirish..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">Markaz Nomlari</th>
                <th className="px-6 py-4">Obuna</th>
                <th className="px-6 py-4 text-center">Statistika</th>
                <th className="px-6 py-4">Holat</th>
                <th className="px-6 py-4 text-right">Boshqaruv</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8">
                      <div className="h-8 rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filteredCenters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Building2 className="h-8 w-8 text-slate-400" />
                      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Topilmadi</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCenters.map((center) => (
                  <tr key={center.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-50 text-brand flex items-center justify-center font-bold text-sm shrink-0">
                          {center.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {center.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">/{center.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <PlanBadge plan={center.subscription_plan} className="scale-90" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-700">{center.student_count}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">O'quvchi</span>
                        </div>
                        <div className="flex flex-col items-center border-l border-slate-100 pl-4">
                          <span className="text-xs font-bold text-slate-700">{center.teacher_count}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ustoz</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={center.status} className="scale-90" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/super-admin/centers/${center.id}`)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => toggleCenterStatus(center)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        >
                          {center.status === "Faol" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedCenter(center);
                            setIsDeleteModalOpen(true);
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCenterModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCenter}
      />

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCenter}
        title="Markazni o'chirish"
        message={`"${selectedCenter?.name}" markazini o'chirishga aminmisiz? Ushbu amalni ortga qaytarib bo'lmaydi va markazga tegishli barcha ma'lumotlar o'chib ketishi mumkin.`}
      />
    </div>
  );
}
