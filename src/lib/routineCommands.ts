import { db } from '../firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

interface CommandResult {
  matched: boolean;
  replyText: string;
}

export async function processVoiceOrTextCommand(
  text: string,
  userId: string,
  language: 'English' | 'Bengali' | 'Hindi'
): Promise<CommandResult> {
  const lowercaseText = text.toLowerCase().trim();
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to construct response depending on language
  const getResponse = (en: string, bn: string, hi: string) => {
    if (language === 'Bengali') return bn;
    if (language === 'Hindi') return hi;
    return en;
  };

  // 1. "Create my study routine" command
  const matchesRoutine = 
    lowercaseText.includes('create study routine') ||
    lowercaseText.includes('create my study routine') ||
    lowercaseText.includes('build my study routine') ||
    lowercaseText.includes('রুটিন তৈরি করো') ||
    lowercaseText.includes('রুটিন বানাও') ||
    lowercaseText.includes('रूटीन बनाओ') ||
    lowercaseText.includes('रूटीन तैयार करो');

  if (matchesRoutine) {
    const sampleSubjects = [
      { subject: 'Mathematics', title: 'Mathematics Practice', start: '09:00', end: '10:30', desc: 'Focus on Calculus and Algebra exercises.' },
      { subject: 'Physics', title: 'Physics Theory', start: '11:00', end: '12:30', desc: 'Read electromagnetism concepts.' },
      { subject: 'Chemistry', title: 'Chemistry Lab Notes', start: '14:00', end: '15:30', desc: 'Review organic compounds reactions.' },
      { subject: 'Computer Science', title: 'Coding Practice', start: '16:00', end: '17:30', desc: 'Solve algorithms on DSA.' }
    ];

    for (let i = 0; i < sampleSubjects.length; i++) {
      const routineId = `routine_auto_${Date.now()}_${i}`;
      const docRef = doc(collection(db, 'users', userId, 'routines'), routineId);
      await setDoc(docRef, {
        id: routineId,
        userId: userId,
        subject: sampleSubjects[i].subject,
        title: sampleSubjects[i].title,
        description: sampleSubjects[i].desc,
        date: todayStr,
        startTime: sampleSubjects[i].start,
        endTime: sampleSubjects[i].end,
        priority: 'High',
        repeat: 'Daily',
        reminderTime: '5 min',
        completed: false,
        createdAt: new Date().toISOString()
      });
    }

    return {
      matched: true,
      replyText: getResponse(
        "I have created a complete study routine with 4 sessions for you! View it on your dashboard.",
        "আপনার জন্য ৪টি সেশনসহ একটি সম্পূর্ণ পড়ার রুটিন তৈরি করা হয়েছে! ড্যাশবোর্ডে দেখুন।",
        "मैंने आपके लिए 4 सत्रों के साथ एक संपूर्ण अध्ययन दिनचर्या तैयार की है! इसे डैशबोर्ड पर देखें।"
      )
    };
  }

  // 2. "Wake me up at 5 AM / 5 बजे जगा देना / ৫ টায় অ্যালার্ম"
  const wakeUpRegexEn = /(?:wake\s*me\s*up\s*at|wake\s*up\s*at|set\s*alarm\s*at)\s*(\d+)(?:\s*(am|pm))?/i;
  const wakeUpRegexBn = /(\d+)\s*(টায়|টার\s*সময়)\s*(অ্যালার্ম|জাগিয়ে|জাগা)/;
  const wakeUpRegexHi = /(\d+)\s*(बजे)\s*(जगा|अलार्म|याद)/;

  const wakeMatchEn = lowercaseText.match(wakeUpRegexEn);
  const wakeMatchBn = lowercaseText.match(wakeUpRegexBn);
  const wakeMatchHi = lowercaseText.match(wakeUpRegexHi);

  if (wakeMatchEn || wakeMatchBn || wakeMatchHi) {
    let hour = 5;
    let period = 'am';

    if (wakeMatchEn) {
      hour = parseInt(wakeMatchEn[1]);
      if (wakeMatchEn[2]) {
        period = wakeMatchEn[2].toLowerCase();
      } else {
        period = hour >= 1 && hour <= 7 ? 'am' : 'pm'; // smart defaults
      }
    } else if (wakeMatchBn) {
      hour = parseInt(wakeMatchBn[1]);
      // Smart Bengali am/pm detection
      period = lowercaseText.includes('সকাল') || lowercaseText.includes('ভোর') || hour < 8 ? 'am' : 'pm';
    } else if (wakeMatchHi) {
      hour = parseInt(wakeMatchHi[1]);
      // Smart Hindi am/pm detection
      period = lowercaseText.includes('सुबह') || hour < 8 ? 'am' : 'pm';
    }

    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;

    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    const routineId = `routine_wake_${Date.now()}`;
    const docRef = doc(collection(db, 'users', userId, 'routines'), routineId);
    
    await setDoc(docRef, {
      id: routineId,
      userId: userId,
      subject: 'General',
      title: 'Wake Up & Shine',
      description: 'Morning wake up scheduled by AI voice command.',
      date: todayStr,
      startTime: timeStr,
      endTime: `${String((hour + 1) % 24).padStart(2, '0')}:00`,
      priority: 'High',
      repeat: 'Daily',
      reminderTime: 'At Time',
      completed: false,
      createdAt: new Date().toISOString()
    });

    const displayTime = `${hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)} ${hour >= 12 ? 'PM' : 'AM'}`;

    return {
      matched: true,
      replyText: getResponse(
        `Wake up alarm scheduled successfully for ${displayTime}!`,
        `আপনার সকালের অ্যালার্ম ঠিক ${displayTime} টায় সেট করা হয়েছে!`,
        `सुबह का अलार्म सफलतापूर्वक ${displayTime} बजे के लिए सेट हो गया है!`
      )
    };
  }

  // 3. "Remind me at 7 PM / ७ बजे याद दिलाना / ৭ টায় রিমাইন্ডার"
  const remindRegexEn = /(?:remind\s*me\s*at)\s*(\d+)(?:\s*(am|pm))?/i;
  const remindRegexBn = /(\d+)\s*(টায়|টার\s*সময়)\s*রিমাইন্ডার/;
  const remindRegexHi = /(\d+)\s*(बजे)\s*याद\s*दिलाना/;

  const remindMatchEn = lowercaseText.match(remindRegexEn);
  const remindMatchBn = lowercaseText.match(remindRegexBn);
  const remindMatchHi = lowercaseText.match(remindRegexHi);

  if (remindMatchEn || remindMatchBn || remindMatchHi) {
    let hour = 7;
    let period = 'pm';

    if (remindMatchEn) {
      hour = parseInt(remindMatchEn[1]);
      if (remindMatchEn[2]) {
        period = remindMatchEn[2].toLowerCase();
      } else {
        period = hour >= 8 && hour <= 11 ? 'am' : 'pm'; // smart defaults
      }
    } else if (remindMatchBn) {
      hour = parseInt(remindMatchBn[1]);
      period = lowercaseText.includes('সকাল') || hour < 8 ? 'am' : 'pm';
    } else if (remindMatchHi) {
      hour = parseInt(remindMatchHi[1]);
      period = lowercaseText.includes('सुबह') || hour < 8 ? 'am' : 'pm';
    }

    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;

    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    const routineId = `routine_remind_${Date.now()}`;
    const docRef = doc(collection(db, 'users', userId, 'routines'), routineId);

    await setDoc(docRef, {
      id: routineId,
      userId: userId,
      subject: 'Study',
      title: 'Voice Scheduled Reminder',
      description: 'Review notes, practice problems.',
      date: todayStr,
      startTime: timeStr,
      endTime: `${String((hour + 1) % 24).padStart(2, '0')}:00`,
      priority: 'Medium',
      repeat: 'Daily',
      reminderTime: '10 min',
      completed: false,
      createdAt: new Date().toISOString()
    });

    const displayTime = `${hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)} ${hour >= 12 ? 'PM' : 'AM'}`;

    return {
      matched: true,
      replyText: getResponse(
        `Dynamic study reminder successfully set for ${displayTime}!`,
        `আপনার পড়ার রিমাইন্ডার ঠিক ${displayTime} টায় সেট করা হয়েছে!`,
        `पढ़ाई का रिमाइंडर सफलतापूर्वक ${displayTime} बजे सेट हो गया है!`
      )
    };
  }

  // 4. "Add [Subject] class every [Monday]"
  // en: add physics class every monday
  // bn: সোমবার ফিজিক্স ক্লাস যোগ করো
  // hi: सोमवार को फिजिक्स क्लास जोड़ो
  const addClassRegexEn = /add\s+(\w+)\s+class\s+every\s+(\w+)/i;
  const classMatchEn = lowercaseText.match(addClassRegexEn);

  if (classMatchEn) {
    const subjectRaw = classMatchEn[1];
    const dayName = classMatchEn[2];

    const subject = subjectRaw.charAt(0).toUpperCase() + subjectRaw.slice(1);
    const routineId = `routine_class_${Date.now()}`;
    const docRef = doc(collection(db, 'users', userId, 'routines'), routineId);

    // Find next weekday index
    const weekdayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };
    const targetIdx = weekdayMap[dayName.toLowerCase()];
    let targetDate = new Date();
    if (targetIdx !== undefined) {
      const currentDay = targetDate.getDay();
      let distance = targetIdx - currentDay;
      if (distance <= 0) distance += 7;
      targetDate.setDate(targetDate.getDate() + distance);
    }
    const classDateStr = targetDate.toISOString().split('T')[0];

    await setDoc(docRef, {
      id: routineId,
      userId: userId,
      subject: subject,
      title: `${subject} Class`,
      description: `Weekly ${subject} class scheduled via voice command.`,
      date: classDateStr,
      startTime: '10:00',
      endTime: '11:30',
      priority: 'Medium',
      repeat: 'Weekly',
      reminderTime: '5 min',
      completed: false,
      createdAt: new Date().toISOString()
    });

    return {
      matched: true,
      replyText: getResponse(
        `Weekly ${subject} class added on every ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} at 10:00 AM!`,
        `আপনার জন্য প্রতি ${dayName}-এ সকাল ১০:০০ টায় ${subject} ক্লাস যুক্ত করা হয়েছে!`,
        `आपके लिए हर ${dayName} को सुबह 10:00 बजे ${subject} क्लास जोड़ दी गई है!`
      )
    };
  }

  return { matched: false, replyText: '' };
}
