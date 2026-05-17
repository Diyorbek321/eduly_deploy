export interface Student {
  id: string;
  name: string;
  phone: string;
  group: string;
  status: 'Faol' | 'Kutishda' | 'Muzlatilgan' | 'Ketgan';
  debt: number;
  paid: number;
  isOverdue?: boolean;
  paymentDay?: number;
  attendance: number;
  birthDate: string;
  gender: 'Erkak' | 'Ayol';
  address: string;
  parentName: string;
  parentPhone: string;
  avatar?: string;
  login?: string;
  password?: string;
  hasLogin?: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  groupsCount: number;
  status: 'Faol' | 'Nofaol';
  hours: number;
  studentsCount: number;
  rating: number;
  salary: number;
  hourlyRate: number;
  bonus: number;
  avatar?: string;
  login?: string;
  password?: string;
  experience?: string;
  birthDate?: string;
  bio?: string;
}

export interface Group {
  id: string;
  name: string;
  course: string;
  level: string;
  teacher: string;
  schedule: string;
  time: string;
  room: string;
  capacity: number;
  studentsCount: number;
  status: 'Faol' | 'Qabul ochiq' | 'Boshlanmoqda' | 'Yakunlangan';
}

export interface Course {
  id: string;
  name: string;
  duration: string;
  price: string;
  lessonsCount: number;
  groupsCount: number;
  status: 'Faol' | 'Nofaol';
  description: string;
}

export interface Transaction {
  id: string;
  studentName: string;
  amount: number;
  type: 'Click' | 'Cash' | 'Payme' | 'Card';
  date: string;
  status: 'Muvaffaqiyatli' | 'Kutilmoqda' | 'Rad etildi';
}
