import type { WordDifficulty } from '../../shared/types.js';

/**
 * Curated Persian words categorized by difficulty.
 */
export const PERSIAN_WORDS_BY_DIFFICULTY: Record<'easy' | 'medium' | 'hard', string[]> = {
  easy: [
    // Animals
    'گربه', 'سگ', 'فیل', 'اسب', 'شیر', 'موش', 'ماهی', 'خرس', 'اردک', 'جوجه',
    'خرگوش', 'مار', 'قورباغه', 'پروانه', 'زنبور', 'حلزون', 'کلاغ', 'گوسفند',
    'بز', 'شتر', 'گرگ', 'طوطی', 'غاز', 'کبوتر',
    // Everyday Objects
    'صندلی', 'میز', 'لیوان', 'قاشق', 'چنگال', 'چاقو', 'کتاب', 'دفتر', 'مداد',
    'مسواک', 'شانه', 'تخت', 'ساعت', 'تلفن', 'کلاه', 'کفش', 'جوراب', 'شلوار',
    'پیراهن', 'کلید', 'چتر', 'آینه', 'عینک', 'قیچی', 'لامپ', 'توپ', 'بادکنک',
    'در', 'پنجره', 'صابون', 'حوله', 'جعبه', 'سطل', 'فرش',
    // Food & Fruits
    'سیب', 'موز', 'نان', 'پنیر', 'شیر', 'تخم مرغ', 'هندوانه', 'پرتقال', 'خیار',
    'گوجه', 'هویج', 'ماست', 'بستنی', 'پیتزا', 'کیک', 'چای', 'توت فرنگی', 'انگور',
    'گیلاس', 'لیمو', 'پیاز', 'سیب زمینی', 'شکلات', 'گردو', 'پسته',
    // Nature
    'درخت', 'گل', 'خورشید', 'ماه', 'ستاره', 'ابر', 'باران', 'برف', 'کوه',
    'دریا', 'برگ', 'آتش', 'رودخانه', 'سنگ', 'جنگل',
    // Places & Basics
    'خانه', 'مدرسه', 'پارک', 'پل', 'مغازه', 'چادر', 'دیوار'
  ],

  medium: [
    // Animals
    'زرافه', 'پلنگ', 'پنگوئن', 'عقاب', 'تمساح', 'میمون', 'دلفین', 'نهنگ', 'خفاش',
    'فلامینگو', 'طاووس', 'جوجه تیغی', 'کوسه', 'اختاپوس', 'کانگورو', 'کرگدن',
    'سنجاب', 'شترمرغ', 'کفتار', 'حلزون', 'هدهد', 'دارکوب', 'شپش',
    // Tools & Electronics
    'رایانه', 'لپ تاپ', 'تبلت', 'هدفون', 'تلویزیون', 'ماشین لباسشویی', 'یخچال',
    'جاروبرقی', 'اتو', 'مایکروفر', 'دوربین', 'کولر', 'بخاری', 'نردبان', 'بیل',
    'کلنگ', 'تبر', 'پیچ گوشتی', 'آچار', 'چراغ قوه', 'اره', 'مته', 'پنکه',
    // Vehicles
    'دوچرخه', 'موتور', 'ماشین', 'اتوبوس', 'قطار', 'هواپیما', 'بالگرد', 'قایق',
    'کشتی', 'زیردریایی', 'تراکتور', 'آمبولانس', 'آتش نشانی', 'ون', 'موشک',
    'بالون', 'اسکیت', 'درشکه', 'کامیون',
    // Food & Drinks
    'ساندویچ', 'همبرگر', 'ماکارونی', 'کباب', 'قورمه سبزی', 'قیمه', 'املت',
    'آبگوشت', 'پیراشکی', 'پاپ کورن', 'سوسیس', 'دلمه', 'فالوده', 'آش', 'آبمیوه',
    // Clothing & Accessories
    'کراوات', 'پاپیون', 'دستکش', 'بوت', 'گوشواره', 'گردنبند', 'انگشتر', 'دستبند',
    'کوله پشتی', 'کلاه کاسکت', 'عینک آفتابی', 'دمپایی', 'شال گردن', 'کمربند',
    // Places & Buildings
    'بیمارستان', 'فرودگاه', 'مسجد', 'هتل', 'سینما', 'برج میلاد', 'بانک', 'دانشگاه',
    'استادیوم', 'استخر', 'موزه', 'رستوران', 'باغ وحش', 'شهربازی', 'فروشگاه',
    // Professions
    'پزشک', 'پرستار', 'پلیس', 'آتش نشان', 'نانوا', 'خلبان', 'فضانورد',
    'دندانپزشک', 'معلم', 'آشپز', 'عکاس', 'نقاش', 'مکانیک', 'کشاورز', 'قاضی'
  ],

  hard: [
    // Concepts & Phenomena
    'جاذبه', 'سیاه چاله', 'کسوف', 'خسوف', 'رعد و برق', 'گردباد', 'سونامی',
    'آتشفشان', 'زلزله', 'بهمن', 'رنگین کمان', 'سراب', 'شفق قطبی', 'کویر',
    'قطب شمال', 'شهاب سنگ', 'جزیره متروکه', 'بی وزنی',
    // Complex Objects & Devices
    'تلسکوپ', 'میکروسکوپ', 'قطب نما', 'دیگ زودپز', 'پرگار', 'تراز',
    'کپسول آتش نشانی', 'ماسک گاز', 'رادیاتور', 'ماهواره', 'گاوصندوق', 'بادنما',
    'چتر نجات', 'فانوس دریایی', 'چرخ خیاطی', 'منگنه', 'آهنربا', 'فسیل',
    // Activities & States
    'خمیازه', 'عطسه', 'سکسکه', 'غواصی', 'اسکی', 'بولینگ', 'شطرنج', 'طناب کشی',
    'تردستی', 'ماهیگیری', 'یوگا', 'موج سواری', 'کاراته', 'بندبازی', 'خروپف',
    'خوابگردی', 'سقوط آزاد', 'تیراندازی',
    // Mythical, Fantasy & Abstract
    'کابوس', 'رویا', 'کارآگاه', 'دزد دریایی', 'مومیایی', 'خون آشام', 'سیمرغ',
    'دیو', 'روح', 'زامبی', 'هیولا', 'دایناسور', 'مجسمه آزادی', 'اهرام مصر',
    'نقشه گنج', 'تابوت', 'کرم شب تاب', 'تار عنکبوت', 'لانه لک لک', 'قفل رمزدار',
    'رد پا', 'سایه', 'طناب دار', 'هزارتو'
  ]
};

/**
 * Full combined Persian word bank
 */
export const PERSIAN_WORD_BANK: string[] = [
  ...PERSIAN_WORDS_BY_DIFFICULTY.easy,
  ...PERSIAN_WORDS_BY_DIFFICULTY.medium,
  ...PERSIAN_WORDS_BY_DIFFICULTY.hard
];

/**
 * Returns `count` unique random Persian words from the word bank,
 * filtered by difficulty and optionally mixing in custom words.
 */
export function getRandomPersianWords(
  count: number,
  customWords: string[] = [],
  difficulty: WordDifficulty = 'all'
): string[] {
  const sanitizedCustom = customWords
    .map((w) => w.trim())
    .filter((w) => w.length > 1);

  let baseWords: string[];
  if (difficulty === 'easy') {
    baseWords = PERSIAN_WORDS_BY_DIFFICULTY.easy;
  } else if (difficulty === 'medium') {
    baseWords = PERSIAN_WORDS_BY_DIFFICULTY.medium;
  } else if (difficulty === 'hard') {
    baseWords = PERSIAN_WORDS_BY_DIFFICULTY.hard;
  } else {
    baseWords = PERSIAN_WORD_BANK;
  }

  // Combine curated and custom words, avoiding duplicates
  const pool = Array.from(new Set([...baseWords, ...sanitizedCustom]));

  const selected: string[] = [];
  const poolCopy = [...pool];

  while (selected.length < count && poolCopy.length > 0) {
    const randomIndex = Math.floor(Math.random() * poolCopy.length);
    selected.push(poolCopy.splice(randomIndex, 1)[0]);
  }

  return selected;
}

