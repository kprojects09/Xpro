const fs = require('fs');
let code = fs.readFileSync('src/components/LearnCenter.tsx', 'utf-8');

// Update State Type
code = code.replace(
  "const [learnTab, setLearnTab] = useState<'timer' | 'quiz' | 'notes' | 'planner' | 'leaderboard'>('timer');",
  "const [learnTab, setLearnTab] = useState<'timer' | 'quiz' | 'notes' | 'materials' | 'planner' | 'leaderboard'>('timer');"
);

// Add Tab Button
const tabsBlock = `          { id: 'timer', label: 'Pomodoro Timer', icon: Clock },
          { id: 'quiz', label: 'AI Quiz Engine', icon: Brain },
          { id: 'notes', label: 'Subject Notes', icon: BookMarked },
          { id: 'materials', label: 'Study Materials', icon: BookOpen },
          { id: 'planner', label: 'Daily Planner', icon: ListTodo },
          { id: 'leaderboard', label: 'Achievements', icon: Trophy }`;

code = code.replace(/\{ id: 'timer'[\s\S]*\{ id: 'leaderboard', label: 'Achievements', icon: Trophy \}/, tabsBlock);

fs.writeFileSync('src/components/LearnCenter.tsx', code);
