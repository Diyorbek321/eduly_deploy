import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, ShoppingCart, CheckCircle2, Loader2, WifiOff } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, type Variants } from 'motion/react';
import {
  rewardService,
  type PurchaseApi,
  type RewardApi,
  type WalletApi,
} from '../services/studentService';
import { useRewardsStream } from '../lib/useRewardsStream';
import { ShopSkeleton } from '../components/Skeleton';
import { swr, invalidate } from '../lib/swrCache';
import { useAuth } from '../context/AuthContext';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

export default function Shop() {
  const [rewards, setRewards] = useState<RewardApi[]>([]);
  const [wallet, setWallet] = useState<WalletApi | null>(null);
  const [purchases, setPurchases] = useState<PurchaseApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const flash = (kind: 'ok' | 'error', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3000);
  };

  // SWR cache keys are namespaced per user so a different student on the
  // same device never inherits stale rewards/wallet from the previous one.
  const { user } = useAuth();
  const ns = user ? `u${user.id}` : 'anon';

  // Coalesce bursts of SSE events (e.g. admin updates several rewards at
  // once) into a single refetch on the next animation frame.
  const refetchScheduled = useRef(false);
  const loadAll = useCallback(async (showSpinner = true) => {
    // Stale-while-revalidate: paint cached values immediately so offline
    // users still see the shop (read-only). The buy action is gated by the
    // live network so they get a clear error if they're truly offline.
    const swrR = swr<RewardApi[]>(`${ns}:rewards`, () => rewardService.list());
    const swrW = swr<WalletApi>(`${ns}:wallet`, () => rewardService.wallet());
    const swrP = swr<PurchaseApi[]>(`${ns}:purchases`, () => rewardService.purchases());

    if (swrR.cached) setRewards(swrR.cached);
    if (swrW.cached) setWallet(swrW.cached);
    if (swrP.cached) setPurchases(swrP.cached);

    const hasAnyCache = Boolean(swrR.cached || swrW.cached || swrP.cached);
    if (showSpinner && !hasAnyCache) setLoading(true);

    try {
      const [r, w, p] = await Promise.all([swrR.live, swrW.live, swrP.live]);
      setRewards(r);
      setWallet(w);
      setPurchases(p);
    } catch (e: any) {
      // Don't blank the UI — cache is already on screen. Toast tells the
      // student we're stale.
      if (hasAnyCache) {
        flash('error', "Internet yo'q. Eski ma'lumotlar ko'rsatilmoqda.");
      } else {
        flash('error', e?.message || "Yuklab bo'lmadi");
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [ns]);

  const scheduleRefetch = useCallback(() => {
    if (refetchScheduled.current) return;
    refetchScheduled.current = true;
    requestAnimationFrame(() => {
      refetchScheduled.current = false;
      void loadAll(false);
    });
  }, [loadAll]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const { state: streamState } = useRewardsStream({ onEvent: scheduleRefetch });

  const buy = async (reward: RewardApi) => {
    if (!wallet || wallet.coins < reward.cost || reward.stock <= 0) return;
    setBuyingId(reward.id);
    try {
      await rewardService.buy(reward.id);
      flash('ok', `${reward.name} sotib olindi!`);
      // Stock + wallet just changed server-side — drop the SWR cache so the
      // refetch below doesn't briefly flash the pre-buy values.
      invalidate(`${ns}:rewards`);
      invalidate(`${ns}:wallet`);
      invalidate(`${ns}:purchases`);
      await loadAll(false);
    } catch (e: any) {
      flash('error', e?.message || 'Xarid qilinmadi');
    } finally {
      setBuyingId(null);
    }
  };

  const purchasedIds = new Set(purchases.map((p) => p.reward_id));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 pb-20"
    >
      {toast && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl text-sm font-bold shadow-xl',
            toast.kind === 'ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          )}
        >
          {toast.text}
        </div>
      )}

      {(streamState === 'polling' || streamState === 'lost') && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-amber-500/90 text-white text-xs font-semibold shadow-lg flex items-center gap-1.5">
          <WifiOff size={12} />
          {streamState === 'polling' ? 'Real vaqt rejimi yo\'q — yangilanmoqda' : 'Ulanish yo\'qoldi'}
        </div>
      )}

      <motion.section
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <h2 className="text-4xl font-extrabold font-headline tracking-tight mb-2">
            Rewards Shop
          </h2>
          <p className="text-on-surface-variant max-w-md">
            Tanga evaziga mukofotlarga ega bo'ling.
          </p>
        </div>

        <div className="relative overflow-hidden premium-gradient p-6 rounded-4xl min-w-[240px] shadow-lg flex flex-col justify-between h-32 text-white">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              Joriy balans
            </span>
            <ShoppingCart size={20} className="opacity-40" />
          </div>
          <div className="flex items-center gap-2">
            <Coins className="text-tertiary-container fill-tertiary-container" size={32} />
            <span className="text-4xl font-black">{(wallet?.coins ?? 0).toLocaleString()}</span>
            <span className="font-bold text-sm uppercase opacity-80">Tanga</span>
          </div>
        </div>
      </motion.section>

      {loading && rewards.length === 0 && (
        <ShopSkeleton />
      )}

      {!loading && rewards.length === 0 && (
        <p className="text-sm text-on-surface-variant">Hozircha mukofotlar yo'q.</p>
      )}

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {rewards.map((item) => {
          const owned = purchasedIds.has(item.id);
          const canAfford = (wallet?.coins ?? 0) >= item.cost;
          const outOfStock = item.stock <= 0;
          const busy = buyingId === item.id;

          return (
            <div
              key={item.id}
              className="group flex flex-col bg-surface-container-low rounded-4xl overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="relative overflow-hidden h-56 bg-surface-container">
                {item.image ? (
                  <img
                    src={item.image}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt={item.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                    <ShoppingCart size={40} />
                  </div>
                )}
                {owned && (
                  <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-white/90 p-4 rounded-3xl flex items-center gap-2 shadow-2xl">
                      <CheckCircle2 size={24} className="text-primary" />
                      <span className="font-black text-xs uppercase tracking-widest text-primary">
                        Olingan
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-8 flex flex-col gap-4 h-full">
                <div>
                  <h3 className="text-xl font-bold">{item.name}</h3>
                  <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                    Qoldiq: {item.stock} ta
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins size={20} className="text-tertiary fill-tertiary" />
                    <span className="font-black text-xl">{item.cost}</span>
                  </div>
                  <button
                    disabled={busy || outOfStock || !canAfford}
                    onClick={() => buy(item)}
                    className={cn(
                      'font-bold px-8 py-2.5 rounded-2xl active:scale-95 transition-all text-sm flex items-center gap-2',
                      outOfStock
                        ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                        : canAfford
                        ? 'premium-gradient text-white shadow-lg'
                        : 'bg-surface-container-low text-on-surface-variant/50 border border-surface-container cursor-not-allowed'
                    )}
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    {outOfStock
                      ? 'Tugagan'
                      : !canAfford
                      ? 'Balans kam'
                      : busy
                      ? 'Kutish…'
                      : 'Sotib olish'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
