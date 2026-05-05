/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  GraduationCap, 
  Settings, 
  Shield, 
  BarChart3,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Plus
} from "lucide-react";
import { superAdminApi } from "../../lib/superAdminApi";
import { EducationCenter, CenterAdmin } from "../../types";
import { formatDate } from "../../lib/utils";
import StatusBadge from "../../components/superAdmin/StatusBadge";
import PlanBadge from "../../components/superAdmin/PlanBadge";
import CreateAdminModal from "../../components/superAdmin/CreateAdminModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const centerUpdateSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  subscription_plan: z.enum(["Basic", "Pro", "Enterprise"]),
});

type CenterUpdateForm = z.infer<typeof centerUpdateSchema>;

export default function CenterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [center, setCenter] = useState<EducationCenter | null>(null);
  const [admins, setAdmins] = useState<CenterAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "admins" | "stats">("info");
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm<CenterUpdateForm>({
    resolver: zodResolver(centerUpdateSchema),
  });

  useEffect(() => {
    if (id) {
      fetchCenterDetails();
    }
  }, [id]);

  async function fetchCenterDetails() {
    setIsLoading(true);
    try {
      if (!id) return;
      const [centerData, adminsData] = await Promise.all([
        superAdminApi.getCenter(id),
        superAdminApi.getCenterAdmins(id),
      ]);
      setCenter(centerData);
      setAdmins(adminsData);
      reset({
        name: centerData.name,
        phone: centerData.phone,
        address: centerData.address,
        subscription_plan: centerData.subscription_plan,
      });
    } catch (error) {
      console.error("Fetch center details error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleUpdateCenter = async (data: CenterUpdateForm) => {
    if (!id) return;
    try {
      const updated = await superAdminApi.updateCenter(id, data);
      setCenter(updated);
      alert("Ma'lumotlar saqlandi");
    } catch (error) {
      console.error("Update center error:", error);
    }
  };

  const handleCreateAdmin = async (data: any) => {
    if (!id) return;
    try {
      await superAdminApi.createCenterAdmin(id, data);
      setIsAdminModalOpen(false);
      const adminsData = await superAdminApi.getCenterAdmins(id);
      setAdmins(adminsData);
    } catch (error) {
      console.error("Create admin error:", error);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (confirm("Ushbu adminni o'chirishga aminmisiz?")) {
      try {
        await superAdminApi.deleteAdmin(adminId);
        setAdmins(admins.filter(a => a.id !== adminId));
      } catch (error) {
        console.error("Delete admin error:", error);
      }
    }
  };

  if (isLoading || !center) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ec5b13] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <button 
        onClick={() => navigate("/super-admin/centers")}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Orqaga
      </button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ec5b13]/10 text-2xl font-bold text-[#ec5b13]">
            {center.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{center.name}</h1>
              <StatusBadge status={center.status} />
              <PlanBadge plan={center.subscription_plan} />
            </div>
            <p className="text-sm text-gray-500">eduly.uz/{center.slug} • {formatDate(center.created_at)} da ochilgan</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">Talabalar</p>
            <p className="text-lg font-bold text-gray-900">{center.student_count}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">O'qituvchilar</p>
            <p className="text-lg font-bold text-gray-900">{center.teacher_count}</p>
          </div>
        </div>
      </header>

      <div className="flex border-b border-gray-100">
        {[
          { id: "info", label: "Ma'lumotlar", icon: Building2 },
          { id: "admins", label: "Adminlar", icon: Shield },
          { id: "stats", label: "Statistika", icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-[#ec5b13] text-[#ec5b13]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "info" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Markaz parametrlari</h3>
              <form onSubmit={handleSubmit(handleUpdateCenter)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Markaz nomi</label>
                    <input 
                      {...register("name")}
                      className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-[#ec5b13]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Telefon</label>
                    <input 
                      {...register("phone")}
                      className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-[#ec5b13]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Tarif</label>
                    <select 
                      {...register("subscription_plan")}
                      className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-[#ec5b13]"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Manzil</label>
                    <input 
                      {...register("address")}
                      className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-[#ec5b13]"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <button className="rounded-xl bg-[#ec5b13] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d94e0d] transition-all active:scale-95">
                    Saqlash
                  </button>
                </div>
              </form>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Aloqa ma'lumotlari</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="rounded-lg bg-gray-100 p-2"><Phone className="h-4 w-4" /></div>
                    {center.phone || "Kiritilmagan"}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="rounded-lg bg-gray-100 p-2"><MapPin className="h-4 w-4" /></div>
                    <span className="leading-tight">{center.address || "Kiritilmagan"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "admins" && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Markaz adminlari</h3>
              <button 
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                <Plus className="h-4 w-4" />
                Yangi admin qo'shish
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-6 py-4">Ism</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Holat</th>
                    <th className="px-6 py-4">Sana</th>
                    <th className="px-6 py-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Hech qanday admin topilmadi</td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 transition-colors capitalize">
                        <td className="px-6 py-4 font-bold text-gray-900">{admin.full_name}</td>
                        <td className="px-6 py-4 text-gray-500 lowercase">{admin.email}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={admin.status} />
                        </td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(admin.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="rounded-2xl bg-white p-12 shadow-sm border border-gray-100 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Markaz statistikasi</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2 text-sm italic">
              Ushbu bo'limda markazning moliway va o'quv natijalari tahlili ko'rsatiladi. Hozirda funksiya ishlanish jarayonida.
            </p>
          </div>
        )}
      </div>

      <CreateAdminModal 
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSubmit={handleCreateAdmin}
      />
    </div>
  );
}
