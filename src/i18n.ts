import type { Lang } from '../shared/types';

// Amharic strings were written for this project and have NOT been reviewed by a professional translator.
const en = {
  home: 'Home', diary: 'Diary', scan: 'Scan', advisor: 'Advisor', profile: 'Profile',
  goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
  kcalLeft: 'kcal left', eaten: 'Eaten', dailyTarget: 'Daily target', protein: 'Protein', carbs: 'Carbs', fat: 'Fat',
  analyze: 'Analyze', logMeal: 'Log meal', askAi: 'Ask AI', plan: 'Plan', todaysMeals: "Today's meals",
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
  nothingLogged: 'Nothing logged yet', addFood: '+ Add food', foodDatabase: 'Food database', searchFoods: 'Search foods',
  all: 'All', ethiopian: 'Ethiopian', grains: 'Grains', proteinCat: 'Protein', vegetables: 'Vegetables', fruit: 'Fruit', drinks: 'Drinks',
  foodDiary: 'Food diary', ofKcal: 'of {n} kcal', scanFood: 'Scan food', photo: 'Photo', barcode: 'Barcode', placeMeal: 'Place your meal in the frame',
  goodLight: 'Good light and a top-down angle improve results', gallery: 'Gallery', flash: 'Flash',
  mealAnalysis: 'Meal analysis', estCalories: 'estimated calories', approx: 'Estimates are approximate.', saveMeal: 'Save meal',
  nutriAdvisor: 'NutriCare Advisor', askAbout: 'Ask about meals, calories and habits', askYourAdvisor: 'Ask your advisor...',
  aiAdvisor: 'AI Advisor', nutrition: 'Nutrition', fitness: 'Fitness', askExercise: 'Ask about exercise...',
  mealPlanner: 'Meal planner', planWeek: 'Plan your week', replace: 'Replace', generatePlan: 'Generate plan', savePlan: 'Save plan',
  analytics: 'Analytics', progress: 'Your progress over time', days7: '7 days', days30: '30 days', months3: '3 months',
  editProfile: 'Edit profile', nutritionHdr: 'NUTRITION', settingsHdr: 'SETTINGS', goals: 'Nutrition goals', dietPrefs: 'Dietary preferences',
  allergies: 'Allergies', units: 'Units', language: 'Language', account: 'Account settings', logOut: 'Log out',
  signIn: 'Sign in', createAccount: 'Create account', welcomeBack: 'Welcome back', email: 'Email', password: 'Password', show: 'Show', hide: 'Hide',
  getStarted: 'Get Started', skip: 'Skip', save: 'Save', cancel: 'Cancel', add: 'Add', loading: 'Loading...',
  disclaimer: 'NutriCare gives general nutrition information, not medical advice. Talk to a doctor or dietitian for personal medical needs.',
};
export type Key = keyof typeof en;
const am: Record<Key, string> = {
  home: 'መነሻ', diary: 'ማስታወሻ', scan: 'ስካን', advisor: 'አማካሪ', profile: 'መገለጫ',
  goodMorning: 'እንደምን አደሩ', goodAfternoon: 'እንደምን ዋሉ', goodEvening: 'እንደምን አመሹ',
  kcalLeft: 'kcal ቀሪ', eaten: 'የተበላ', dailyTarget: 'የዕለት ግብ', protein: 'ፕሮቲን', carbs: 'ካርቦሃይድሬት', fat: 'ስብ',
  analyze: 'ተንትን', logMeal: 'ምግብ መዝግብ', askAi: 'AI ጠይቅ', plan: 'ዕቅድ', todaysMeals: 'የዛሬ ምግቦች',
  breakfast: 'ቁርስ', lunch: 'ምሳ', dinner: 'እራት', snack: 'መክሰስ',
  nothingLogged: 'ምንም አልተመዘገበም', addFood: '+ ምግብ ጨምር', foodDatabase: 'የምግብ ዳታቤዝ', searchFoods: 'ምግብ ፈልግ',
  all: 'ሁሉም', ethiopian: 'ኢትዮጵያዊ', grains: 'እህሎች', proteinCat: 'ፕሮቲን', vegetables: 'አትክልት', fruit: 'ፍራፍሬ', drinks: 'መጠጦች',
  foodDiary: 'የምግብ ማስታወሻ', ofKcal: 'ከ {n} kcal', scanFood: 'ምግብ ስካን', photo: 'ፎቶ', barcode: 'ባርኮድ', placeMeal: 'ምግብዎን በፍሬሙ ውስጥ ያስቀምጡ',
  goodLight: 'ጥሩ ብርሃን እና ከላይ ማንሳት ውጤትን ያሻሽላል', gallery: 'ጋለሪ', flash: 'ፍላሽ',
  mealAnalysis: 'የምግብ ትንተና', estCalories: 'የተገመተ ካሎሪ', approx: 'ግምቶች ትክክለኛ አይደሉም።', saveMeal: 'ምግብ አስቀምጥ',
  nutriAdvisor: 'ኒውትሪኬር አማካሪ', askAbout: 'ስለ ምግብ፣ ካሎሪ እና ልማዶች ይጠይቁ', askYourAdvisor: 'አማካሪዎን ይጠይቁ...',
  aiAdvisor: 'AI አማካሪ', nutrition: 'አመጋገብ', fitness: 'አካል ብቃት', askExercise: 'ስለ ስፖርት ይጠይቁ...',
  mealPlanner: 'የምግብ ዕቅድ', planWeek: 'ሳምንትዎን ያቅዱ', replace: 'ቀይር', generatePlan: 'ዕቅድ ፍጠር', savePlan: 'ዕቅድ አስቀምጥ',
  analytics: 'ትንታኔ', progress: 'የጊዜ ሂደትዎ', days7: '7 ቀናት', days30: '30 ቀናት', months3: '3 ወራት',
  editProfile: 'መገለጫ አርትዕ', nutritionHdr: 'አመጋገብ', settingsHdr: 'ቅንብሮች', goals: 'የአመጋገብ ግቦች', dietPrefs: 'የአመጋገብ ምርጫዎች',
  allergies: 'አለርጂዎች', units: 'መለኪያ', language: 'ቋንቋ', account: 'የመለያ ቅንብሮች', logOut: 'ውጣ',
  signIn: 'ግባ', createAccount: 'መለያ ክፈት', welcomeBack: 'እንኳን ደህና መጡ', email: 'ኢሜይል', password: 'የይለፍ ቃል', show: 'አሳይ', hide: 'ደብቅ',
  getStarted: 'ጀምር', skip: 'ዝለል', save: 'አስቀምጥ', cancel: 'ሰርዝ', add: 'ጨምር', loading: 'በመጫን ላይ...',
  disclaimer: 'ኒውትሪኬር አጠቃላይ የአመጋገብ መረጃ ይሰጣል እንጂ የሕክምና ምክር አይደለም። ለግል የሕክምና ጉዳዮች ሐኪም ወይም የአመጋገብ ባለሙያ ያማክሩ።',
};
export const dict: Record<Lang, Record<Key, string>> = { en, am };
