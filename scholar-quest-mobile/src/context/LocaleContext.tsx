import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Locale = 'uz' | 'ru' | 'en';

const LOCALE_KEY = 'sq.locale';

type Dict = Record<string, string>;

const translations: Record<Locale, Dict> = {
  en: {
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account and preferences.',
    'settings.appearance': 'Appearance',
    'settings.language': 'Language',
    'settings.notifications': 'Notifications',
    'settings.dataMgmt': 'Data Management',
    'settings.information': 'Information',
    'settings.logout': 'Log Out',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    'lang.uz': 'Uzbek',
    'lang.ru': 'Russian',
    'lang.en': 'English',
    'schedule.title': 'My Attendance',
    'schedule.subtitle': 'Consistent learning leads to mastery. Your current streak is at its peak!',
    'schedule.overall': 'Overall Score',
    'schedule.weekly': 'Weekly Schedule',
    'schedule.empty': 'No scheduled classes yet.',
    'schedule.prev': 'Previous',
    'schedule.next': 'Next',
    'schedule.loading': 'Loading…',
    'schedule.errorLoad': 'Could not load attendance.',
    'schedule.noAttendance': 'No attendance records for this period.',
    'circles.title': 'My Learning Circle',
    'circles.subtitle': 'Subjects and group you are enrolled in.',
    'circles.empty': 'You are not enrolled in any group yet.',
    'circles.members': 'Members',
    'circles.teacher': 'Teacher',
    'circles.subjects': 'My Subjects',
    'rank.title': 'Leaderboard',
    'rank.daily': 'Daily',
    'rank.weekly': 'Weekly',
    'rank.circle': 'Circle',
    'rank.empty': 'No ranking data for this filter.',
    'common.viewAll': 'View All',
    'common.present': 'Present',
    'common.absent': 'Absent',
    'common.late': 'Late',
    'common.excused': 'Excused',
    'homework.title': 'Homework',
    'homework.subtitle': 'Tasks from your teachers — earn coins for done!',
    'homework.empty': 'No homework here.',
    'homework.due': 'Due',
    'homework.pending': 'Pending',
    'homework.done': 'Done',
    'homework.totalCount': 'Total',
    'homework.filter.all': 'All',
    'homework.filter.pending': 'Pending',
    'homework.filter.done': 'Done',
    'homework.filter.not_done': 'Missed',
    'homework.status.pending': 'Pending',
    'homework.status.done': 'Done',
    'homework.status.notDone': 'Missed',
    'nav.homework': 'Homework',
  },
  uz: {
    'settings.title': 'Sozlamalar',
    'settings.subtitle': 'Akkount va sozlamalarni boshqaring.',
    'settings.appearance': 'Ko‘rinish',
    'settings.language': 'Til',
    'settings.notifications': 'Bildirishnomalar',
    'settings.dataMgmt': 'Maʼlumotlarni boshqarish',
    'settings.information': 'Maʼlumot',
    'settings.logout': 'Chiqish',
    'theme.light': 'Yorug‘',
    'theme.dark': 'Qorong‘i',
    'theme.system': 'Tizim',
    'lang.uz': 'O‘zbekcha',
    'lang.ru': 'Ruscha',
    'lang.en': 'Inglizcha',
    'schedule.title': 'Davomatim',
    'schedule.subtitle': 'Muntazam o‘qish — mahoratga olib boradi.',
    'schedule.overall': 'Umumiy ball',
    'schedule.weekly': 'Haftalik jadval',
    'schedule.empty': 'Hozircha darslar yo‘q.',
    'schedule.prev': 'Oldingi',
    'schedule.next': 'Keyingi',
    'schedule.loading': 'Yuklanmoqda…',
    'schedule.errorLoad': 'Davomatni yuklab bo‘lmadi.',
    'schedule.noAttendance': 'Bu davr uchun davomat yo‘q.',
    'circles.title': 'Mening o‘quv guruhim',
    'circles.subtitle': 'Siz qo‘shilgan fanlar va guruh.',
    'circles.empty': 'Siz hali biror guruhga qo‘shilmagansiz.',
    'circles.members': 'A\'zolar',
    'circles.teacher': 'O‘qituvchi',
    'circles.subjects': 'Mening fanlarim',
    'rank.title': 'Reyting',
    'rank.daily': 'Kunlik',
    'rank.weekly': 'Haftalik',
    'rank.circle': 'Guruh',
    'rank.empty': 'Bu filter uchun maʼlumot yo‘q.',
    'common.viewAll': 'Barchasi',
    'common.present': 'Kelgan',
    'common.absent': 'Kelmagan',
    'common.late': 'Kechikkan',
    'common.excused': 'Sababli',
    'homework.title': 'Uy vazifalari',
    'homework.subtitle': "O'qituvchidan vazifa — bajarganga tanga!",
    'homework.empty': "Hozircha vazifa yo'q.",
    'homework.due': 'Muddat',
    'homework.pending': 'Kutilmoqda',
    'homework.done': 'Bajarildi',
    'homework.totalCount': 'Jami',
    'homework.filter.all': 'Hammasi',
    'homework.filter.pending': 'Kutilmoqda',
    'homework.filter.done': 'Bajardi',
    'homework.filter.not_done': 'Bajarmadi',
    'homework.status.pending': 'Kutilmoqda',
    'homework.status.done': 'Bajardi',
    'homework.status.notDone': 'Bajarmadi',
    'nav.homework': 'Vazifalar',
  },
  ru: {
    'settings.title': 'Настройки',
    'settings.subtitle': 'Управляйте аккаунтом и предпочтениями.',
    'settings.appearance': 'Оформление',
    'settings.language': 'Язык',
    'settings.notifications': 'Уведомления',
    'settings.dataMgmt': 'Управление данными',
    'settings.information': 'Информация',
    'settings.logout': 'Выйти',
    'theme.light': 'Светлая',
    'theme.dark': 'Тёмная',
    'theme.system': 'Системная',
    'lang.uz': 'Узбекский',
    'lang.ru': 'Русский',
    'lang.en': 'Английский',
    'schedule.title': 'Моя посещаемость',
    'schedule.subtitle': 'Регулярная учёба ведёт к мастерству.',
    'schedule.overall': 'Общий балл',
    'schedule.weekly': 'Расписание недели',
    'schedule.empty': 'Занятий пока нет.',
    'schedule.prev': 'Назад',
    'schedule.next': 'Вперёд',
    'schedule.loading': 'Загрузка…',
    'schedule.errorLoad': 'Не удалось загрузить посещаемость.',
    'schedule.noAttendance': 'Нет данных за этот период.',
    'circles.title': 'Мой учебный круг',
    'circles.subtitle': 'Предметы и группа, в которых вы записаны.',
    'circles.empty': 'Вы пока не состоите в группе.',
    'circles.members': 'Участники',
    'circles.teacher': 'Учитель',
    'circles.subjects': 'Мои предметы',
    'rank.title': 'Рейтинг',
    'rank.daily': 'День',
    'rank.weekly': 'Неделя',
    'rank.circle': 'Круг',
    'rank.empty': 'Нет данных для этого фильтра.',
    'common.viewAll': 'Все',
    'common.present': 'Присутствовал',
    'common.absent': 'Отсутствовал',
    'common.late': 'Опоздал',
    'common.excused': 'Уважительно',
    'homework.title': 'Домашние задания',
    'homework.subtitle': 'Задания от учителей — за выполнение монеты!',
    'homework.empty': 'Заданий пока нет.',
    'homework.due': 'Срок',
    'homework.pending': 'Ожидает',
    'homework.done': 'Готово',
    'homework.totalCount': 'Всего',
    'homework.filter.all': 'Все',
    'homework.filter.pending': 'Ожидает',
    'homework.filter.done': 'Готово',
    'homework.filter.not_done': 'Не сдал',
    'homework.status.pending': 'Ожидает',
    'homework.status.done': 'Готово',
    'homework.status.notDone': 'Не сдал',
    'nav.homework': 'Задания',
  },
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    if (v === 'uz' || v === 'ru' || v === 'en') return v;
  } catch {}
  return 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(LOCALE_KEY, l); } catch {}
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: string) => {
    return translations[locale][key] ?? translations.en[key] ?? key;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
