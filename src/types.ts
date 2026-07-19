export interface Routine {
  id: string;
  userId: string;
  subject: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  priority: 'High' | 'Medium' | 'Low';
  repeat: 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
  reminderTime: 'At Time' | '5 min' | '10 min' | '15 min' | '30 min' | '1 hour';
  completed: boolean;
  missed?: boolean;
  createdAt: string;
}

export type AppLanguage = 'English' | 'Bengali' | 'Hindi';
