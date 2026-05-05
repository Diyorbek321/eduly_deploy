/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import {
  Users,
  Building2,
  TrendingUp,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { superAdminApi } from "../../lib/superAdminApi";
import { EducationCenter, DashboardStats } from "../../types";
import { formatCurrency, formatDate, cn } from "../../lib/utils";
import StatusBadge from "../../components/superAdmin/StatusBadge";
import { Link } from "react-router-dom";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCenters, setRecentCenters] = useState<EducationCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, centersData] = await Promise.all([
          superAdminApi.getStats(),
          superAdminApi.getCenters(),
        ]);
        setStats(statsData);
        setRecentCenters(centersData.slice(0, 5));
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-gray-100" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Jami markazlar",
      value: stats.total_centers,
      icon: Building2,
      growth: "+12%",
    },
    {
      title: "Faol markazlar",
      value: stats.active_centers,
      icon: TrendingUp,
      sub: "87.5%",
    },
    {
      title: "Jami o'quvchilar",
      value: stats.total_students.toLocaleString(),
      icon: Users,
      growth: "+8.4%",
    },
    {
      title: "Oylik daromad",
      value: formatCurrency(stats.mrr),
      icon: CreditCard,
      sub: "MRR",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
          >
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{stat.title}</p>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
              {stat.growth && (
                <span className="text-emerald-500 text-[10px] font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded-full">
                  {stat.growth}
                </span>
              )}
              {stat.sub && (
                <span className={cn("text-[10px] font-bold font-mono", stat.sub === "MRR" ? "text-brand" : "text-slate-400")}>
                  {stat.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-slate-800">O'sish dinamikasi</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-brand"></span> Markazlar
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span> O'quvchilar
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.growth_series}>
                <defs>
                  <linearGradient id="colorCenters" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec5b13" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ec5b13" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="centers" 
                  stroke="#ec5b13" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCenters)" 
                  name="Markazlar"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h2 className="font-bold text-slate-800">Yangi qo'shilganlar</h2>
            <Link 
              to="/super-admin/centers" 
              className="text-[10px] font-bold text-brand hover:underline uppercase tracking-wider"
            >
              Barchasi
            </Link>
          </div>
          <div className="space-y-4 flex-1 overflow-auto pr-1">
            {recentCenters.map((center) => (
              <Link
                key={center.id}
                to={`/super-admin/centers/${center.id}`}
                className="flex items-center gap-3 border-b border-slate-50 pb-3 last:border-0 hover:bg-slate-50/50 -mx-2 px-2 transition-colors rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-brand flex items-center justify-center font-bold text-sm shrink-0">
                  {center.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{center.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{formatDate(center.created_at)}</p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={center.status} className="scale-90 origin-right" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
