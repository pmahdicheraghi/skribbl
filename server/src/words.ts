/**
 * Curated Persian bag of words categorized into common concepts.
 */
export const PERSIAN_WORD_BANK: string[] = [
  // Animals (حیوانات)
  'گربه', 'سگ', 'فیل', 'شیر', 'پلنگ', 'زرافه', 'طوطی', 'شتر', 'روباه',
  'خرس', 'ماهی', 'اسب', 'خرگوش', 'پنگوئن', 'عقاب', 'قورباغه', 'تمساح',
  'میمون', 'کبوتر', 'مار', 'دلفین', 'نهنگ', 'خفاش', 'جوجه', 'اردک',

  // Objects & Tools (اشیاء و ابزار)
  'ساعت', 'تلفن', 'تلویزیون', 'یخچال', 'رایانه', 'عینک', 'کتاب', 'چتر',
  'صندلی', 'میز', 'بالش', 'قاشق', 'چنگال', 'لیوان', 'چاقو', 'لامپ',
  'کلید', 'قیچی', 'شانه', 'مداد', 'دفتر', 'دوربین', 'آینه', 'بادکنک',

  // Vehicles (وسایل نقلیه)
  'هواپیما', 'قایق', 'کشتی', 'دوچرخه', 'قطار', 'موتور', 'ماشین', 'اتوبوس',
  'بالگرد', 'تراکتور', 'موشک', 'کامیون',

  // Food & Fruits (خوراکی‌ها و میوه‌ها)
  'سیب', 'موز', 'هندوانه', 'پرتقال', 'انگور', 'پیتزا', 'ساندویچ', 'بستنی',
  'کیک', 'شکلات', 'نان', 'تخم مرغ', 'پنیر', 'گوجه', 'خیار', 'هویج',
  'پیاز', 'ماکارونی', 'کباب', 'انار', 'توت فرنگی',

  // Nature & Weather (طبیعت و آب‌وهوا)
  'درخت', 'گل', 'خورشید', 'ماه', 'ستاره', 'کوه', 'دریا', 'رودخانه',
  'ابر', 'باران', 'برف', 'جنگل', 'بیابان', 'رنگین کمان', 'آتش',

  // Places & Buildings (مکان‌ها)
  'خانه', 'پل', 'مدرسه', 'بیمارستان', 'مسجد', 'برج', 'چادر',

  // Clothes (پوشاک)
  'کلاه', 'کفش', 'شلوار', 'پیراهن', 'جوراب', 'دستکش', 'شال'
];

/**
 * Returns `count` unique random Persian words from the word bank,
 * optionally mixing in valid custom words provided by the room host.
 */
export function getRandomPersianWords(count: number, customWords: string[] = []): string[] {
  const sanitizedCustom = customWords
    .map(w => w.trim())
    .filter(w => w.length > 1);

  // Combine curated and custom words, avoiding duplicates
  const pool = Array.from(new Set([...PERSIAN_WORD_BANK, ...sanitizedCustom]));

  const selected: string[] = [];
  const poolCopy = [...pool];

  while (selected.length < count && poolCopy.length > 0) {
    const randomIndex = Math.floor(Math.random() * poolCopy.length);
    selected.push(poolCopy.splice(randomIndex, 1)[0]);
  }

  return selected;
}
