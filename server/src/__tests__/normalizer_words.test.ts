import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePersian, levenshteinDistance } from '../normalizer.js';
import { getRandomPersianWords, PERSIAN_WORD_BANK } from '../words.js';

test('normalizePersian normalizes Arabic characters and diacritics', () => {
  // Arabic yeh and kaf
  assert.equal(normalizePersian('ساندويچ'), 'ساندویچ');
  assert.equal(normalizePersian('كتاب'), 'کتاب');
  // Diacritics (erab)
  assert.equal(normalizePersian('خَانِه‌'), 'خانه');
  assert.equal(normalizePersian('کِتاب'), 'کتاب');
  // Alef variations
  assert.equal(normalizePersian('آب'), 'اب');
  assert.equal(normalizePersian('أحمد'), 'احمد');
  // ZWNJ (نیم‌فاصله)
  assert.equal(normalizePersian('ماشین‌حساب'), 'ماشین حساب');
  // Whitespace trimming
  assert.equal(normalizePersian('  گربه  '), 'گربه');
});

test('levenshteinDistance computes edit distance correctly', () => {
  assert.equal(levenshteinDistance('گربه', 'گربه'), 0);
  assert.equal(levenshteinDistance('گربه', 'بربه'), 1);
  assert.equal(levenshteinDistance('هواپیما', 'هواپیما'), 0);
  assert.equal(levenshteinDistance('هواپیما', 'هواپیماها'), 2);
});

test('getRandomPersianWords returns requested number of unique words', () => {
  const words = getRandomPersianWords(3);
  assert.equal(words.length, 3);
  assert.equal(new Set(words).size, 3);
  // Ensure words come from the bank
  for (const word of words) {
    assert.ok(PERSIAN_WORD_BANK.includes(word));
  }
});

test('getRandomPersianWords incorporates custom words if provided', () => {
  const custom = ['تست‌یک', 'تست‌دو', 'تست‌سه'];
  const words = getRandomPersianWords(3, custom);
  assert.equal(words.length, 3);
  // Custom words should be in the pool
  const pool = [...PERSIAN_WORD_BANK, ...custom];
  for (const word of words) {
    assert.ok(pool.includes(word));
  }
});

test('getRandomPersianWords filters by difficulty', () => {
  const easyWords = getRandomPersianWords(5, [], 'easy');
  assert.equal(easyWords.length, 5);

  const hardWords = getRandomPersianWords(5, [], 'hard');
  assert.equal(hardWords.length, 5);

  assert.ok(PERSIAN_WORD_BANK.length >= 600, `Expected at least 600 words, got ${PERSIAN_WORD_BANK.length}`);
  const uniqueWords = new Set(PERSIAN_WORD_BANK);
  assert.equal(uniqueWords.size, PERSIAN_WORD_BANK.length, `Duplicate words found in bank! Duplicate count: ${PERSIAN_WORD_BANK.length - uniqueWords.size}`);
});

