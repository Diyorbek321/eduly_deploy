/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "motion/react";
import { X, UserPlus, Copy, Check } from "lucide-react";
import { useState } from "react";

const adminSchema = z.object({
  full_name: z.string().min(2, "To'liq ism kamida 2 ta belgidan iborat bo'lishi kerak"),
  email: z.string().email("Noto'g'ri email manzil"),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
    .regex(/[a-zA-Z]/, "Parolda kamida bitta harf bo'lishi kerak")
    .regex(/[0-9]/, "Parolda kamida bitta raqam bo'lishi kerak"),
});

type AdminForm = z.infer<typeof adminSchema>;

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdminForm) => void;
}

export default function CreateAdminModal({ isOpen, onClose, onSubmit }: CreateAdminModalProps) {
  const [copied, setCopied] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
  });

  const password = watch("password");

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure at least one letter and one number
    pass += "a1";
    setValue("password", pass);
  };

  const copyToClipboard = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFormSubmit = (data: AdminForm) => {
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
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                <UserPlus className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Yangi admin qo'shish</h2>
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
              <label className="block text-sm font-medium text-gray-700">To'liq ism</label>
              <input
                {...register("full_name")}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#ec5b13] focus:ring-[#ec5b13] h-11 outline-none"
                placeholder="Azamat Akramov"
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  {...register("email")}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#ec5b13] focus:ring-[#ec5b13] h-11 outline-none"
                  placeholder="admin@example.uz"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  {...register("phone")}
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#ec5b13] focus:ring-[#ec5b13] h-11 outline-none"
                  placeholder="+998 90 111 22 33"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Parol</label>
              <div className="mt-1 flex gap-2">
                <div className="relative flex-1">
                  <input
                    {...register("password")}
                    type="text"
                    className="block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-[#ec5b13] focus:ring-[#ec5b13] h-11 outline-none"
                    placeholder="Kamida 8 belgi"
                  />
                  {password && (
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="absolute right-2 top-1.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="rounded-xl border border-gray-300 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center h-11"
                >
                  Generatsiya
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
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
