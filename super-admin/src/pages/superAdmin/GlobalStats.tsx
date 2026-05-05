/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { superAdminApi } from "../../lib/superAdminApi";
import { EducationCenter, DashboardStats } from "../../types";
import StatusBadge from "../../components/superAdmin/StatusBadge";
import { Users, Building2, TrendingUp, DollarSign } from "lucide-react";

export default function GlobalStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [centers, setCenters] = useState<EducationCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, centersData] = await Promise.all([
          superAdminApi.getStats(),
          superAdminApi.getCenters(),
        ]);
        setStats(statsData);
        setCenters(centersData.sort((a, b) => b.student_count - a.student_count));
      } catch (error) {
        console.error("Stats error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading || !stats) {
    return <div className="h-screen flex items-center justify-center">Yuklanmoqda...</div>;
  }

  // Calculate plan distribution
  const planData = [
    { name: "Basic", value: centers.filter(c => c.subscription_plan === "Basic").length, color: "#94a3b8" },
    { name: "Pro", value: centers.filter(c => c.subscription_plan === "Pro").length, color: "#3b82f6" },
    { name: "Enterprise", value: centers.filter(c => c.subscription_plan === "Enterprise").length, color: "#ec5b13" },
  ];

  const statusData = [
    { name: "Faol", value: centers.filter(c => c.status === "Faol").length, color: "#22c55e" },
    { name: "Muzlatilgan", value: centers.filter(c => c.status === "Muzlatilgan").length, color: "#eab308" },
    { name: "O'chirilgan", value: centers.filter(c => c.status === "O'chirilgan").length, color: "#ef4444" },
  ];

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Global Statistika</h1>
        <p className="text-sm text-gray-500">Tizimdagi barcha ma'lumotlar tahlili</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Plan Distribution */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#ec5b13]" />
            Tariflar bo'yicha tushum
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {planData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-left flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#ec5b13]" />
            Markazlar holati
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-medium text-gray-500">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Centers */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#ec5b13]" />
            Eng ko'p o'quvchiga ega markazlar (Top 10)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase">
                <th className="px-6 py-4">Reyting</th>
                <th className="px-6 py-4">Markaz</th>
                <th className="px-6 py-4">O'quvchilar</th>
                <th className="px-6 py-4">O'qituvchilar</th>
                <th className="px-6 py-4">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {centers.slice(0, 10).map((center, index) => (
                <tr key={center.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-400">#{index + 1}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{center.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${(center.student_count / 1500) * 100}%` }} 
                        />
                      </div>
                      <span className="font-medium">{center.student_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{center.teacher_count}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={center.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
