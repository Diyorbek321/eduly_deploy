/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "motion/react";
import { X, Building2 } from "lucide-react";

const centerSchema = z.object({
  name: z.string().min(2, "Markaz nomi kamida 2 ta belgidan iborat bo'lishi kerak"),
  slug: z
    .string()
    .min(2, "Slug kamida 2 ta belgi bo'lishi kerak")
    .regex(/^[a-z0-9-]+$/, "Slug faqat kichik lotin harflari, raqamlar va chiziqcha (-)dan iborat bo'lishi kerak"),
  phone: z.string().optional(),
  address: z.string().optional(),
  subscription_plan: z.enum(["Basic", "Pro", "Enterprise"]),
});

type CenterForm = z.infer<typeof centerSchema>;

interface CreateCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CenterForm) => void;
}

export default function CreateCenterModal({ isOpen, onClose, onSubmit }: CreateCenterModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CenterForm>({
    resolver: zodResolver(centerSchema),
    defaultValues: {
      subscription_plan: "Basic",
    },
  });

  const handleFormSubmit = (data: CenterForm) => {
    onSubmit(data);
    reset();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#ec5b13]/10 p-2 text-[#ec5b13]">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Yangi markaz qo'shish</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Markaz nomi</label>
              <input
                {...register("name")}
                className={z.string().safeParse(errors.name?.message).success ? "border-red-500" : "mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#ec5b13] focus:ring-[#ec5b13] sm:text-sm h-11 px-4 border"}
                placeholder="Masalan: Everest Academy"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Slug (URL uchun)</label>
              <div className="mt-1 flex rounded-xl border border-gray-300 bg-gray-50 shadow-sm focus-within:border-[#ec5b13] focus-within:ring-1 focus-within:ring-[#ec5b13]">
                <span className="flex items-center pl-3 text-sm text-gray-500 select-none">eduly.uz/</span>
                <input
                  {...register("slug")}
                  className="block w-full border-0 bg-transparent px-1 py-2 text-sm focus:ring-0 h-11 outline-none"
                  placeholder="everest-academy"
                />
              </div>
              {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  {...register("phone")}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#ec5b13] focus:ring-[#ec5b13] h-11 outline-none"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tarif rejasi</label>
                <select
                  {...register("subscription_plan")}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#ec5b13] focus:ring-[#ec5b13] h-11 outline-none"
                >
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Manzil</label>
              <input
                {...register("address")}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#ec5b13] focus:ring-[#ec5b13] h-11 outline-none"
                placeholder="Toshkent sh., Yunusobod tumani"
              />
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#ec5b13] px-6 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-[#ec5b13] hover:bg-[#d94e0d] disabled:opacity-50 transition-all active:scale-95"
              >
                {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
