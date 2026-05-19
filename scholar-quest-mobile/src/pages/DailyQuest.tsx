import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, CheckCircle2, XCircle, ChevronRight,
  Coins, Trophy, Loader2, Sparkles, RefreshCw,
} from 'lucide-react';
import { api, apiRequest } from '../lib/api';

interface Question {
  type: 'mcq' | 'truefalse' | 'fillblank';
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

interface QuestData {
  quest_id: number;
  module_id: number;
  module_name: string;
  course_name: string;
  date: string;
  questions: Question[];
  completed: boolean;
  score: number | null;
  coins_awarded: boolean;
}

interface SubmitResult {
  score: number;
  total: number;
  passed: boolean;
  coins_awarded: boolean;
  coins_amount: number;
}

// ─── Single Question view ─────────────────────────────────────────────────────

function QuestionView({
  question, index, total, onAnswer, selectedAnswer, locked,
}: {
  question: Question;
  index: number;
  total: number;
  onAnswer: (opt: string) => void;
  selectedAnswer: string | null;
  locked: boolean;
}) {
  const isCorrect = (opt: string) => locked && opt === question.correct;
  const isWrong = (opt: string) => locked && opt === selectedAnswer && opt !== question.correct;

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-5"
    >
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-outline-variant rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((index) / total) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-muted">{index + 1}/{total}</span>
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
          question.type === 'mcq' ? 'bg-violet-100 text-violet-700'
          : question.type === 'truefalse' ? 'bg-sky-100 text-sky-700'
          : 'bg-amber-100 text-amber-700'
        }`}>
          {question.type === 'mcq' ? '🔤 Ko\'p tanlov'
            : question.type === 'truefalse' ? '⚖️ To\'g\'ri/Noto\'g\'ri'
            : '✏️ Bo\'sh joyni to\'ldir'}
        </span>
      </div>

      {/* Question */}
      <div className="bg-surface-container rounded-3xl p-5">
        <p className="text-base font-bold text-on-surface leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map(opt => {
          const correct = isCorrect(opt);
          const wrong = isWrong(opt);
          const selected = selectedAnswer === opt;

          return (
            <motion.button
              key={opt}
              type="button"
              whileTap={!locked ? { scale: 0.97 } : {}}
              onClick={() => !locked && onAnswer(opt)}
              disabled={locked}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm font-bold transition-all ${
                correct ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : wrong ? 'border-rose-400 bg-rose-50 text-rose-700'
                : selected ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant bg-surface text-on-surface hover:border-primary/40'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{opt}</span>
                {correct && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
                {wrong && <XCircle size={16} className="text-rose-400 flex-shrink-0" />}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Explanation after answering */}
      {locked && question.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container rounded-2xl px-4 py-3 text-xs text-muted leading-relaxed"
        >
          💡 {question.explanation}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Result screen ────────────────────────────────────────────────────────────

function ResultScreen({ result, moduleName, onBack }: { result: SubmitResult; moduleName: string; onBack: () => void }) {
  const passed = result.score >= 9;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center space-y-6 py-8"
    >
      <div className={`size-24 rounded-3xl flex items-center justify-center text-5xl ${passed ? 'bg-yellow-50' : 'bg-surface-container'}`}>
        {passed ? '🏆' : result.score >= 7 ? '😊' : '📚'}
      </div>

      <div>
        <h2 className="text-2xl font-black text-on-surface">
          {passed ? 'Ajoyib natija!' : result.score >= 7 ? 'Yaxshi harakat!' : 'Davom eting!'}
        </h2>
        <p className="text-muted mt-1">{moduleName}</p>
      </div>

      {/* Score ring */}
      <div className="relative size-28">
        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--md-outline-variant, #e2e8f0)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none"
            stroke={passed ? '#10b981' : result.score >= 7 ? '#f59e0b' : '#6366f1'}
            strokeWidth="3"
            strokeDasharray={`${(result.score / result.total) * 100} ${100 - (result.score / result.total) * 100}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-on-surface">{result.score}</span>
          <span className="text-xs text-muted">/ {result.total}</span>
        </div>
      </div>

      {result.coins_awarded && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-6 py-4"
        >
          <span className="text-3xl">🪙</span>
          <div className="text-left">
            <p className="font-black text-yellow-800 text-lg">+{result.coins_amount} coin!</p>
            <p className="text-xs text-yellow-600">90% dan oshirib muvaffaqiyat qozondingiz</p>
          </div>
        </motion.div>
      )}

      <p className="text-sm text-muted px-6">
        {passed
          ? "To'g'ri javoblar: " + result.score + "/" + result.total + ". Keyingi questni kutib turing!"
          : "Har kuni yangi savolar bilan mashq qiling. Ertaga yana sinab ko'ring!"}
      </p>

      <button type="button" onClick={onBack}
        className="px-8 py-3 bg-primary text-white rounded-2xl font-bold text-sm">
        Orqaga
      </button>
    </motion.div>
  );
}

// ─── Quest runner ─────────────────────────────────────────────────────────────

function QuestRunner({ quest, onDone }: { quest: QuestData; onDone: (r: SubmitResult) => void }) {
  const questions = quest.questions;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const answer = answers[current] ?? null;

  const handleAnswer = (opt: string) => {
    if (locked) return;
    setAnswers(prev => ({ ...prev, [current]: opt }));
    setLocked(true);
  };

  const next = async () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setLocked(false);
    } else {
      // Submit all answers
      setSubmitting(true);
      try {
        const payload: Record<string, string> = {};
        for (let i = 0; i < questions.length; i++) {
          payload[String(i)] = answers[i] ?? '';
        }
        const res = await apiRequest<SubmitResult>(`/daily-quests/${quest.quest_id}/submit`, {
          method: 'POST',
          body: { answers: payload },
        });
        if (res) onDone(res);
      } catch {
        // If already submitted, show generic result
        const score = Object.values(answers).filter(
          (a, i) => a === questions[i]?.correct
        ).length;
        onDone({ score, total: questions.length, passed: score >= 9, coins_awarded: false, coins_amount: 0 });
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="font-bold text-muted">Natijalar hisoblanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <AnimatePresence mode="wait">
        <QuestionView
          key={current}
          question={questions[current]}
          index={current}
          total={questions.length}
          onAnswer={handleAnswer}
          selectedAnswer={answer}
          locked={locked}
        />
      </AnimatePresence>

      {locked && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={next}
          className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base flex items-center justify-center gap-2"
        >
          {current < questions.length - 1 ? (
            <><span>Keyingi savol</span><ChevronRight size={18} /></>
          ) : (
            <><Trophy size={18} /><span>Natijani ko'rish</span></>
          )}
        </motion.button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DailyQuestPage() {
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<QuestData | null>(null);
  const [result, setResult] = useState<{ data: SubmitResult; moduleName: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ quests: QuestData[] }>('/daily-quests/today');
      const data = (res as any)?.quests ?? (res as any)?.data?.quests ?? [];
      setQuests(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (result) {
    return (
      <div className="pb-20">
        <ResultScreen
          result={result.data}
          moduleName={result.moduleName}
          onBack={() => { setResult(null); setActive(null); load(); }}
        />
      </div>
    );
  }

  if (active) {
    return (
      <div className="pb-20">
        <button type="button" onClick={() => setActive(null)}
          className="flex items-center gap-1.5 text-sm text-muted font-bold mb-5">
          ← {active.module_name} · {active.course_name}
        </button>
        <QuestRunner
          quest={active}
          onDone={r => setResult({ data: r, moduleName: active.module_name })}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        <Loader2 size={28} className="animate-spin mr-3" /> Yuklanmoqda...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 pb-20"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-on-surface">Kunlik Quest</h1>
          <p className="text-sm text-muted mt-0.5">AI tomonidan har kuni yangi savollar</p>
        </div>
        <button type="button" onClick={load} className="p-2 rounded-xl hover:bg-surface-container text-muted">
          <RefreshCw size={18} />
        </button>
      </div>

      {quests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted">
          <div className="size-20 rounded-3xl bg-surface-container flex items-center justify-center">
            <Brain size={36} className="text-muted" />
          </div>
          <div className="text-center">
            <p className="font-bold text-on-surface mb-1">Bugun quest yo'q</p>
            <p className="text-sm">Siz hali hech qaysi modulga biriktirilmagan yoki<br />bugun questlar yaratilmagan</p>
          </div>
        </div>
      ) : (
        quests.map(q => (
          <motion.div
            key={q.quest_id}
            className={`rounded-3xl p-5 border-2 ${q.completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-outline-variant bg-surface-container'}`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-muted bg-surface px-2 py-0.5 rounded-full border border-outline-variant">
                    {q.course_name}
                  </span>
                </div>
                <h3 className="font-black text-on-surface text-base">{q.module_name}</h3>
                <p className="text-xs text-muted mt-0.5">{q.questions.length} ta savol</p>
              </div>
              {q.completed ? (
                <div className="flex flex-col items-end gap-1">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600">{q.score}/10</span>
                </div>
              ) : (
                <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
              )}
            </div>

            {q.completed ? (
              <div className="text-sm text-emerald-700 font-bold flex items-center gap-2">
                <CheckCircle2 size={14} />
                Bugun bajarildi{q.coins_awarded ? ' · +5 coin' : ''}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActive(q)}
                className="w-full py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <Brain size={16} /> Questni boshlash
              </button>
            )}
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
