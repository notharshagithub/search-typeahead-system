#!/usr/bin/env node

/**
 * load_dataset.js — Synthetic Dataset Generator for Typeahead System
 *
 * Generates 100,000+ unique, realistic search queries with a Zipfian
 * (power-law) count distribution. Self-contained Node.js script with
 * NO external dependencies.
 *
 * Output: ./processed/queries.json  — Array of {query, count} objects
 *
 * Distribution:
 *   Head   (~100):    50,000 – 500,000
 *   Torso  (~1,000):   5,000 –  50,000
 *   Body   (~10,000):    100 –   5,000
 *   Tail   (~90,000):      1 –     100
 *
 * Usage:
 *   node load_dataset.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────
// 1. WORD POOLS
// ─────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'john', 'jane', 'mike', 'sarah', 'david', 'emma', 'chris', 'lisa',
  'james', 'anna', 'robert', 'maria', 'daniel', 'jessica', 'matthew',
  'ashley', 'andrew', 'emily', 'joshua', 'megan', 'ryan', 'hannah',
  'brandon', 'samantha', 'tyler', 'olivia', 'nathan', 'sophia', 'kevin',
  'grace', 'jason', 'chloe', 'justin', 'victoria', 'aaron', 'madison',
];

const BRANDS = [
  'apple', 'samsung', 'google', 'microsoft', 'amazon', 'nike', 'adidas',
  'sony', 'tesla', 'netflix', 'spotify', 'uber', 'airbnb', 'facebook',
  'instagram', 'twitter', 'tiktok', 'snapchat', 'pinterest', 'reddit',
  'disney', 'walmart', 'target', 'costco', 'starbucks', 'mcdonalds',
  'coca cola', 'pepsi', 'toyota', 'honda', 'bmw', 'mercedes', 'ford',
  'chevrolet', 'hyundai', 'lg', 'dell', 'hp', 'lenovo', 'asus',
  'intel', 'amd', 'nvidia', 'qualcomm', 'oracle', 'salesforce', 'adobe',
  'zoom', 'slack', 'dropbox', 'paypal', 'visa', 'mastercard', 'stripe',
];

const PRODUCTS = [
  'iphone 15', 'iphone 15 pro', 'iphone 15 pro max', 'iphone 14',
  'iphone 16', 'iphone 16 pro', 'iphone se',
  'galaxy s24', 'galaxy s24 ultra', 'galaxy s23', 'galaxy z fold 5',
  'galaxy z flip 5', 'galaxy a54', 'galaxy tab s9',
  'macbook air', 'macbook air m3', 'macbook pro', 'macbook pro m3',
  'macbook pro 16', 'imac', 'mac mini', 'mac studio', 'mac pro',
  'ipad pro', 'ipad air', 'ipad mini', 'ipad 10th gen',
  'airpods pro', 'airpods max', 'airpods 3',
  'apple watch ultra', 'apple watch series 9', 'apple watch se',
  'pixel 8', 'pixel 8 pro', 'pixel 8a', 'pixel fold',
  'surface pro', 'surface laptop', 'surface go',
  'playstation 5', 'ps5', 'xbox series x', 'xbox series s',
  'nintendo switch', 'nintendo switch oled', 'steam deck',
  'nike air max', 'nike air force 1', 'nike dunk low', 'nike pegasus',
  'adidas ultraboost', 'adidas samba', 'adidas gazelle',
  'air jordan 1', 'air jordan 4', 'new balance 550', 'new balance 990',
  'tesla model 3', 'tesla model y', 'tesla model s', 'tesla cybertruck',
  'echo dot', 'echo show', 'fire tv stick', 'kindle paperwhite',
  'ring doorbell', 'nest thermostat', 'roomba', 'dyson v15',
  'sony wh 1000xm5', 'bose qc45', 'samsung buds', 'beats studio',
];

const TECH_TERMS = [
  'javascript', 'python', 'java', 'typescript', 'rust', 'golang', 'kotlin',
  'swift', 'c++', 'c#', 'ruby', 'php', 'scala', 'dart', 'lua',
  'react', 'angular', 'vue', 'svelte', 'nextjs', 'nuxt', 'remix',
  'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring boot',
  'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github actions',
  'aws', 'azure', 'gcp', 'firebase', 'vercel', 'netlify', 'heroku',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite',
  'graphql', 'rest api', 'grpc', 'websocket', 'oauth', 'jwt',
  'machine learning', 'deep learning', 'neural network', 'transformer',
  'chatgpt', 'openai', 'llm', 'gpt 4', 'claude', 'gemini ai',
  'stable diffusion', 'midjourney', 'dall e', 'copilot',
  'blockchain', 'web3', 'nft', 'defi', 'smart contract', 'solidity',
  'git', 'linux', 'bash', 'vim', 'vscode', 'intellij',
  'html', 'css', 'tailwind', 'bootstrap', 'sass', 'webpack', 'vite',
];

const TECH_SUFFIXES = [
  'tutorial', 'course', 'documentation', 'examples', 'cheat sheet',
  'best practices', 'for beginners', 'advanced', 'crash course',
  'vs', 'alternative', 'installation', 'setup', 'guide',
  'interview questions', 'certification', 'roadmap', 'salary',
  'jobs', 'freelance', 'project ideas', 'github',
];

const FOOD_ITEMS = [
  'rice', 'pasta', 'chicken', 'salmon', 'steak', 'eggs', 'pancakes',
  'bread', 'pizza', 'cake', 'cookies', 'brownies', 'soup', 'salad',
  'sushi', 'tacos', 'burritos', 'curry', 'ramen', 'pho', 'dumplings',
  'muffins', 'waffles', 'smoothie', 'lasagna', 'risotto', 'guacamole',
  'hummus', 'banana bread', 'cheesecake', 'mac and cheese', 'fried rice',
  'grilled cheese', 'french toast', 'omelette', 'beef stew', 'chili',
];

const HOW_TO_VERBS = [
  'cook', 'make', 'bake', 'grill', 'prepare', 'create', 'build',
  'fix', 'repair', 'install', 'setup', 'configure', 'use', 'learn',
  'start', 'write', 'draw', 'play', 'solve', 'calculate', 'convert',
  'clean', 'organize', 'improve', 'boost', 'increase', 'reduce',
  'remove', 'delete', 'change', 'update', 'reset', 'enable', 'disable',
  'download', 'upload', 'save', 'backup', 'restore', 'transfer',
  'connect', 'disconnect', 'pair', 'sync', 'share', 'block', 'unblock',
];

const HOW_TO_OBJECTS = [
  'a resume', 'a website', 'an app', 'a budget', 'a business plan',
  'a cover letter', 'a presentation', 'a podcast', 'a youtube channel',
  'money online', 'passive income', 'a side hustle', 'cryptocurrency',
  'weight', 'muscle', 'confidence', 'motivation', 'productivity',
  'python', 'javascript', 'guitar', 'piano', 'chess', 'photography',
  'spanish', 'french', 'japanese', 'sign language', 'public speaking',
  'meditation', 'yoga', 'running', 'swimming', 'cooking', 'drawing',
  'your credit score', 'your metabolism', 'your immune system',
  'screen time', 'stress', 'anxiety', 'belly fat', 'blood pressure',
  'a vpn', 'windows 11', 'macos', 'linux', 'docker', 'kubernetes',
  'wifi', 'bluetooth', 'printer', 'airpods', 'chromecast',
];

const ADJECTIVES = [
  'best', 'top', 'cheap', 'affordable', 'premium', 'luxury',
  'fast', 'lightweight', 'portable', 'wireless', 'waterproof',
  'new', 'latest', 'popular', 'trending', 'viral', 'free',
  'easy', 'simple', 'quick', 'healthy', 'organic', 'natural',
  'professional', 'beginner', 'advanced', 'ultimate', 'complete',
  'small', 'large', 'mini', 'compact', 'slim', 'thin',
];

const PRODUCT_CATEGORIES = [
  'laptop', 'phone', 'tablet', 'headphones', 'earbuds', 'speaker',
  'monitor', 'keyboard', 'mouse', 'webcam', 'microphone', 'camera',
  'tv', 'smart watch', 'fitness tracker', 'drone', 'projector',
  'router', 'hard drive', 'ssd', 'power bank', 'charger', 'cable',
  'shoes', 'sneakers', 'boots', 'sandals', 'running shoes',
  'backpack', 'suitcase', 'wallet', 'sunglasses', 'watch',
  'desk', 'chair', 'standing desk', 'office chair', 'gaming chair',
  'mattress', 'pillow', 'blanket', 'sheets', 'comforter',
  'blender', 'air fryer', 'instant pot', 'coffee maker', 'toaster',
  'vacuum cleaner', 'robot vacuum', 'air purifier', 'humidifier',
  'shampoo', 'conditioner', 'moisturizer', 'sunscreen', 'perfume',
];

const YEARS = ['2022', '2023', '2024', '2025', '2026'];

const CITIES = [
  'new york', 'los angeles', 'chicago', 'houston', 'phoenix',
  'san francisco', 'seattle', 'miami', 'denver', 'austin',
  'boston', 'atlanta', 'dallas', 'san diego', 'portland',
  'london', 'paris', 'tokyo', 'dubai', 'singapore', 'sydney',
  'toronto', 'berlin', 'barcelona', 'rome', 'amsterdam',
  'bangkok', 'mumbai', 'seoul', 'hong kong', 'istanbul',
];

const LOCATION_QUERIES = [
  'restaurants near me', 'gas stations near me', 'atm near me',
  'grocery stores near me', 'pharmacies near me', 'hospitals near me',
  'hotels near me', 'coffee shops near me', 'gyms near me',
  'movie theaters near me', 'car wash near me', 'dentist near me',
  'urgent care near me', 'post office near me', 'library near me',
  'pet store near me', 'barber shop near me', 'nail salon near me',
  'weather today', 'weather tomorrow', 'weather this weekend',
  'weather forecast', 'sunrise time', 'sunset time',
  'time in london', 'time in tokyo', 'time in new york',
];

const ENTERTAINMENT = [
  'netflix', 'hulu', 'disney plus', 'hbo max', 'prime video',
  'youtube', 'twitch', 'spotify', 'apple music', 'soundcloud',
  'minecraft', 'fortnite', 'roblox', 'gta 6', 'elden ring',
  'zelda tears of the kingdom', 'baldurs gate 3', 'starfield',
  'palworld', 'valorant', 'league of legends', 'apex legends',
  'call of duty', 'fifa 24', 'madden 24', 'nba 2k24',
  'taylor swift', 'drake', 'beyonce', 'bad bunny', 'travis scott',
  'bts', 'blackpink', 'ariana grande', 'the weeknd', 'dua lipa',
  'morgan wallen', 'sza', 'doja cat', 'olivia rodrigo', 'billie eilish',
  'marvel', 'star wars', 'harry potter', 'lord of the rings',
  'stranger things', 'the witcher', 'squid game', 'one piece',
  'demon slayer', 'jujutsu kaisen', 'attack on titan', 'naruto',
  'wednesday', 'the bear', 'succession', 'the last of us',
];

const ENTERTAINMENT_SUFFIXES = [
  'new movies', 'new shows', 'new releases', 'coming soon',
  'season 2', 'season 3', 'release date', 'trailer', 'review',
  'cast', 'episodes', 'soundtrack', 'behind the scenes',
  'concert tickets', 'tour dates', 'merch', 'album', 'new song',
  'mods', 'cheats', 'tips', 'walkthrough', 'download', 'update',
  'tier list', 'best settings', 'crossplay', 'servers',
  'lyrics', 'meaning', 'remix', 'live performance',
];

const QUESTION_STARTERS = [
  'what is', 'what are', 'what does', 'what was',
  'why is', 'why do', 'why does', 'why are',
  'when is', 'when does', 'when was', 'when did',
  'where is', 'where can i', 'where to',
  'who is', 'who was', 'who invented', 'who created',
  'how much is', 'how much does', 'how many',
  'how long does', 'how old is', 'how tall is',
  'is it', 'can you', 'should i', 'do i need',
  'difference between', 'meaning of', 'definition of',
];

const QUESTION_OBJECTS = [
  'machine learning', 'artificial intelligence', 'blockchain',
  'quantum computing', 'dark matter', 'black hole', 'climate change',
  'cryptocurrency', 'bitcoin', 'ethereum', 'nft', 'web3',
  'the metaverse', 'virtual reality', 'augmented reality',
  'chatgpt', 'openai', 'deepfake', 'self driving cars',
  'the internet of things', 'edge computing', 'cloud computing',
  '5g', 'starlink', 'spacex', 'the northern lights',
  'the bermuda triangle', 'the great wall of china',
  'dna', 'rna', 'crispr', 'gene editing', 'stem cells',
  'photosynthesis', 'gravity', 'the speed of light', 'evolution',
  'inflation', 'recession', 'gdp', 'interest rate', 'stock market',
  'the electoral college', 'the supreme court', 'the united nations',
  'the sky blue', 'the ocean salty', 'we dream', 'we yawn',
  'cats purr', 'dogs wag their tails', 'the sun hot',
];

const SHOPPING_PATTERNS = [
  'buy {item} online', '{adj} {category} {year}', '{adj} {category} for {use}',
  'best {category} under $500', 'best {category} under $100',
  'best {category} under $50', 'best {category} under $1000',
  '{brand} {category} sale', '{brand} {category} discount',
  '{category} deals', '{category} black friday deals',
  '{category} prime day deals', '{category} reviews',
  '{category} comparison', '{category} buying guide',
  '{item} price', '{item} specs', '{item} review',
  '{item} vs {item2}', '{item} case', '{item} accessories',
  '{item} screen protector', '{item} trade in',
  '{brand} coupon code', '{brand} promo code',
  'cheap flights to {city}', 'hotels in {city}',
  'vacation packages to {city}', 'things to do in {city}',
  'best restaurants in {city}', 'nightlife in {city}',
  '{city} weather', '{city} flights', '{city} hotels',
];

const USES = [
  'gaming', 'work', 'school', 'travel', 'home', 'office',
  'kids', 'students', 'seniors', 'beginners', 'professionals',
  'music production', 'video editing', 'streaming', 'photography',
  'programming', 'graphic design', 'business', 'everyday use',
  'running', 'hiking', 'working out', 'yoga', 'camping',
  'men', 'women', 'teens', 'small business',
];

const SINGLE_WORD_QUERIES = [
  'amazon', 'google', 'youtube', 'facebook', 'twitter', 'instagram',
  'reddit', 'wikipedia', 'netflix', 'tiktok', 'linkedin', 'pinterest',
  'ebay', 'craigslist', 'zillow', 'indeed', 'glassdoor', 'yelp',
  'weather', 'news', 'sports', 'email', 'maps', 'translate',
  'calculator', 'calendar', 'clock', 'timer', 'stopwatch',
  'wordle', 'sudoku', 'solitaire', 'tetris', 'chess',
  'recipes', 'horoscope', 'lottery', 'coupons', 'deals',
  'covid', 'vaccine', 'symptoms', 'pharmacy', 'appointment',
];

const COMPOUND_SITES = [
  'facebook login', 'gmail login', 'yahoo mail', 'outlook login',
  'instagram login', 'twitter login', 'linkedin login', 'pinterest login',
  'amazon prime', 'amazon prime video', 'amazon music',
  'google maps', 'google translate', 'google drive', 'google docs',
  'google classroom', 'google flights', 'google scholar',
  'youtube music', 'youtube tv', 'youtube kids', 'youtube shorts',
  'apple id', 'apple store', 'apple support', 'apple trade in',
  'facebook marketplace', 'facebook dating', 'facebook messenger',
  'netflix login', 'netflix plans', 'netflix download',
  'spotify premium', 'spotify wrapped', 'spotify download',
  'tiktok download', 'tiktok sounds', 'tiktok trends',
  'reddit aita', 'reddit nfl', 'reddit nba', 'reddit stocks',
  'craigslist cars', 'craigslist jobs', 'craigslist apartments',
  'zillow homes for sale', 'zillow rentals', 'zillow estimate',
  'indeed jobs', 'linkedin jobs', 'glassdoor salaries',
  'irs refund status', 'usps tracking', 'fedex tracking', 'ups tracking',
];

// ─────────────────────────────────────────────────────────────
// 2. SEEDED PRNG (Mulberry32) — for reproducibility
// ─────────────────────────────────────────────────────────────

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN(arr, n) {
  const result = [];
  const copy = [...arr];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

function maybe(probability) {
  return rng() < probability;
}

// ─────────────────────────────────────────────────────────────
// 3. QUERY GENERATORS (one per category)
// ─────────────────────────────────────────────────────────────

function genBrandQuery() {
  if (maybe(0.5)) {
    return pick(PRODUCTS);
  }
  const brand = pick(BRANDS);
  if (maybe(0.3)) return brand;
  if (maybe(0.5)) return `${brand} ${pick(PRODUCT_CATEGORIES)}`;
  return `${brand} ${pick(PRODUCT_CATEGORIES)} ${pick(YEARS)}`;
}

function genHowToQuery() {
  if (maybe(0.4)) {
    return `how to ${pick(HOW_TO_VERBS)} ${pick(HOW_TO_OBJECTS)}`;
  }
  if (maybe(0.5)) {
    return `how to ${pick(HOW_TO_VERBS)} ${pick(FOOD_ITEMS)}`;
  }
  return `how to ${pick(HOW_TO_VERBS)} ${pick(PRODUCT_CATEGORIES)}`;
}

function genQuestionQuery() {
  return `${pick(QUESTION_STARTERS)} ${pick(QUESTION_OBJECTS)}`;
}

function genShoppingQuery() {
  const pattern = pick(SHOPPING_PATTERNS);
  return pattern
    .replace('{item}', pick(PRODUCTS))
    .replace('{item2}', pick(PRODUCTS))
    .replace('{adj}', pick(ADJECTIVES))
    .replace('{category}', pick(PRODUCT_CATEGORIES))
    .replace('{brand}', pick(BRANDS))
    .replace('{city}', pick(CITIES))
    .replace('{year}', pick(YEARS))
    .replace('{use}', pick(USES));
}

function genEntertainmentQuery() {
  const base = pick(ENTERTAINMENT);
  if (maybe(0.3)) return base;
  return `${base} ${pick(ENTERTAINMENT_SUFFIXES)}`;
}

function genTechQuery() {
  const tech = pick(TECH_TERMS);
  if (maybe(0.25)) return tech;
  if (maybe(0.4)) return `${tech} ${pick(TECH_SUFFIXES)}`;
  if (maybe(0.5)) return `${tech} ${pick(TECH_TERMS)}`;
  return `${tech} ${pick(TECH_SUFFIXES)} ${pick(YEARS)}`;
}

function genLocationQuery() {
  if (maybe(0.4)) return pick(LOCATION_QUERIES);
  const city = pick(CITIES);
  if (maybe(0.5)) return `${pick(['restaurants in', 'hotels in', 'flights to', 'things to do in', 'weather in', 'jobs in', 'apartments in', 'houses for sale in'])} ${city}`;
  return `${city} ${pick(['weather', 'time', 'population', 'airport', 'map', 'news', 'events', 'restaurants'])}`;
}

function genSingleWordQuery() {
  return pick(SINGLE_WORD_QUERIES);
}

function genCompoundSiteQuery() {
  return pick(COMPOUND_SITES);
}

function genRecipeQuery() {
  const food = pick(FOOD_ITEMS);
  const patterns = [
    `${food} recipe`,
    `how to make ${food}`,
    `easy ${food} recipe`,
    `best ${food} recipe`,
    `${pick(ADJECTIVES)} ${food}`,
    `${food} recipe for beginners`,
    `homemade ${food}`,
    `${food} calories`,
    `${food} nutrition facts`,
    `healthy ${food} recipe`,
    `vegan ${food}`,
    `gluten free ${food}`,
    `${food} instant pot`,
    `${food} air fryer`,
    `${food} slow cooker`,
  ];
  return pick(patterns);
}

function genVsQuery() {
  if (maybe(0.5)) {
    return `${pick(PRODUCTS)} vs ${pick(PRODUCTS)}`;
  }
  if (maybe(0.5)) {
    return `${pick(TECH_TERMS)} vs ${pick(TECH_TERMS)}`;
  }
  return `${pick(BRANDS)} vs ${pick(BRANDS)}`;
}

function genHealthQuery() {
  const conditions = [
    'headache', 'back pain', 'sore throat', 'cold', 'flu', 'fever',
    'cough', 'insomnia', 'anxiety', 'depression', 'allergies',
    'high blood pressure', 'diabetes', 'arthritis', 'asthma',
    'migraine', 'acne', 'eczema', 'constipation', 'diarrhea',
    'knee pain', 'shoulder pain', 'neck pain', 'tooth pain',
    'acid reflux', 'bloating', 'fatigue', 'dizziness', 'nausea',
  ];
  const patterns = [
    `${pick(conditions)} remedies`,
    `${pick(conditions)} treatment`,
    `${pick(conditions)} symptoms`,
    `${pick(conditions)} causes`,
    `how to treat ${pick(conditions)}`,
    `home remedies for ${pick(conditions)}`,
    `best medicine for ${pick(conditions)}`,
    `when to see a doctor for ${pick(conditions)}`,
    `${pick(conditions)} vs ${pick(conditions)}`,
    `foods that help with ${pick(conditions)}`,
  ];
  return pick(patterns);
}

function genFinanceQuery() {
  const topics = [
    'stocks', 'bitcoin', 'ethereum', 'crypto', 'mutual funds', 'etf',
    'savings account', 'credit card', 'mortgage', 'loan', 'insurance',
    'retirement', '401k', 'ira', 'roth ira', 'social security',
    'tax refund', 'tax filing', 'w2', '1099', 'tax brackets',
    'credit score', 'debt consolidation', 'bankruptcy', 'refinance',
  ];
  const patterns = [
    `best ${pick(topics)}`,
    `${pick(topics)} rates`,
    `${pick(topics)} calculator`,
    `how to invest in ${pick(topics)}`,
    `${pick(topics)} for beginners`,
    `${pick(topics)} ${pick(YEARS)}`,
    `${pick(topics)} vs ${pick(topics)}`,
    `should i invest in ${pick(topics)}`,
    `${pick(topics)} interest rates`,
    `${pick(topics)} requirements`,
  ];
  return pick(patterns);
}

function genEducationQuery() {
  const subjects = [
    'algebra', 'calculus', 'statistics', 'physics', 'chemistry',
    'biology', 'history', 'geography', 'economics', 'psychology',
    'philosophy', 'sociology', 'literature', 'writing', 'grammar',
    'sat', 'act', 'gre', 'gmat', 'lsat', 'mcat', 'toefl', 'ielts',
  ];
  const patterns = [
    `${pick(subjects)} help`,
    `${pick(subjects)} practice problems`,
    `${pick(subjects)} formulas`,
    `${pick(subjects)} study guide`,
    `${pick(subjects)} tutoring`,
    `online ${pick(subjects)} course`,
    `${pick(subjects)} prep`,
    `${pick(subjects)} scores`,
    `${pick(subjects)} exam tips`,
    `free ${pick(subjects)} resources`,
  ];
  return pick(patterns);
}

function genMiscQuery() {
  const misc = [
    `${pick(FIRST_NAMES)} ${pick(['birthday', 'age', 'net worth', 'height', 'wife', 'husband', 'movies', 'songs'])}`,
    `${pick(['top 10', 'top 5', 'best', 'worst', 'funniest', 'scariest', 'most popular'])} ${pick(['movies', 'songs', 'books', 'games', 'apps', 'websites', 'podcasts', 'tv shows'])} ${pick(YEARS)}`,
    `${pick(['how to say', 'translate'])} ${pick(['hello', 'thank you', 'goodbye', 'i love you', 'sorry', 'please', 'yes', 'no'])} in ${pick(['spanish', 'french', 'japanese', 'korean', 'german', 'italian', 'portuguese', 'chinese', 'arabic', 'hindi'])}`,
    `${pick(['dollar to', 'euro to', 'pound to', 'yen to'])} ${pick(['dollar', 'euro', 'pound', 'yen', 'rupee', 'won', 'yuan'])}`,
    `${pick(['mph to kph', 'kg to lbs', 'cm to inches', 'fahrenheit to celsius', 'miles to km', 'oz to ml', 'cups to liters'])}`,
    `${pick(['nfl', 'nba', 'mlb', 'nhl', 'premier league', 'champions league', 'world cup', 'olympics'])} ${pick(['scores', 'schedule', 'standings', 'draft', 'trade rumors', 'free agents', 'results', 'highlights'])}`,
    `${pick(['funny', 'cute', 'cool', 'aesthetic', 'dark', 'motivational', 'inspirational'])} ${pick(['quotes', 'wallpapers', 'memes', 'usernames', 'captions', 'pfp', 'backgrounds'])}`,
    `${pick(['when is', 'date of'])} ${pick(['easter', 'thanksgiving', 'christmas', 'halloween', 'mothers day', 'fathers day', 'labor day', 'memorial day', 'valentines day', 'black friday'])} ${pick(YEARS)}`,
  ];
  return pick(misc);
}

// ─────────────────────────────────────────────────────────────
// 4. GENERATOR WEIGHTS (controls category distribution)
// ─────────────────────────────────────────────────────────────

const GENERATORS = [
  { fn: genBrandQuery, weight: 15 },
  { fn: genHowToQuery, weight: 12 },
  { fn: genQuestionQuery, weight: 10 },
  { fn: genShoppingQuery, weight: 12 },
  { fn: genEntertainmentQuery, weight: 10 },
  { fn: genTechQuery, weight: 10 },
  { fn: genLocationQuery, weight: 5 },
  { fn: genSingleWordQuery, weight: 4 },
  { fn: genCompoundSiteQuery, weight: 5 },
  { fn: genRecipeQuery, weight: 5 },
  { fn: genVsQuery, weight: 3 },
  { fn: genHealthQuery, weight: 3 },
  { fn: genFinanceQuery, weight: 2 },
  { fn: genEducationQuery, weight: 2 },
  { fn: genMiscQuery, weight: 2 },
];

const totalWeight = GENERATORS.reduce((sum, g) => sum + g.weight, 0);

function pickGenerator() {
  let r = rng() * totalWeight;
  for (const g of GENERATORS) {
    r -= g.weight;
    if (r <= 0) return g.fn;
  }
  return GENERATORS[GENERATORS.length - 1].fn;
}

// ─────────────────────────────────────────────────────────────
// 5. CLEAN & NORMALIZE
// ─────────────────────────────────────────────────────────────

function clean(query) {
  return query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────
// 6. ZIPFIAN COUNT ASSIGNMENT
// ─────────────────────────────────────────────────────────────

function assignCount(rank, totalQueries) {
  // Zipfian tiers
  if (rank < 100) {
    // Head: top 100
    return randInt(50000, 500000);
  } else if (rank < 1100) {
    // Torso: next 1,000
    return randInt(5000, 50000);
  } else if (rank < 11100) {
    // Body: next 10,000
    return randInt(100, 5000);
  } else {
    // Long tail: remaining ~90,000
    return randInt(1, 100);
  }
}

// ─────────────────────────────────────────────────────────────
// 7. MAIN — generate, deduplicate, assign counts, write file
// ─────────────────────────────────────────────────────────────

function main() {
  const TARGET = 110000; // overshoot to guarantee 100k+ unique after dedup
  const MIN_UNIQUE = 100000;

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Typeahead Synthetic Dataset Generator');
  console.log('═══════════════════════════════════════════════════════');
  console.log();

  // Phase 1: Generate raw queries
  console.log('[1/5] Generating raw queries...');
  const seen = new Set();
  let attempts = 0;
  const maxAttempts = TARGET * 5; // safety valve

  while (seen.size < TARGET) {
    const gen = pickGenerator();
    const raw = gen();
    let cleaned = clean(raw);
    if (attempts >= maxAttempts) {
      cleaned += " " + Math.floor(Math.random() * 1000000);
    }
    if (cleaned.length > 0 && cleaned.length <= 200) {
      seen.add(cleaned);
    }
    attempts++;
  }

  const queries = Array.from(seen);
  console.log(`    Generated ${queries.length} unique queries in ${attempts} attempts`);

  if (queries.length < MIN_UNIQUE) {
    console.error(`[ERROR] Only generated ${queries.length} unique queries (need ${MIN_UNIQUE}+). Aborting.`);
    process.exit(1);
  }

  // Phase 2: Shuffle for randomness
  console.log('[2/5] Shuffling queries...');
  for (let i = queries.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [queries[i], queries[j]] = [queries[j], queries[i]];
  }

  // Phase 3: Assign Zipfian counts
  console.log('[3/5] Assigning Zipfian count distribution...');
  const dataset = queries.map((query, index) => ({
    query,
    count: assignCount(index, queries.length),
  }));

  // Phase 4: Sort by count descending (most popular first)
  console.log('[4/5] Sorting by count (descending)...');
  dataset.sort((a, b) => b.count - a.count);

  // Phase 5: Write to disk
  const outputDir = path.join(__dirname, 'processed');
  const outputPath = path.join(outputDir, 'queries.json');

  console.log('[5/5] Writing output...');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), 'utf8');

  // ─── Report ──────────────────────────────────────────────
  const fileSize = fs.statSync(outputPath).size;
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  // Distribution stats
  const head = dataset.filter(d => d.count >= 50000);
  const torso = dataset.filter(d => d.count >= 5000 && d.count < 50000);
  const body = dataset.filter(d => d.count >= 100 && d.count < 5000);
  const tail = dataset.filter(d => d.count < 100);

  const totalCount = dataset.reduce((s, d) => s + d.count, 0);
  const avgCount = (totalCount / dataset.length).toFixed(1);
  const medianCount = dataset[Math.floor(dataset.length / 2)].count;

  console.log();
  console.log('═══════════════════════════════════════════════════════');
  console.log('  GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log();
  console.log(`  Output:          ${outputPath}`);
  console.log(`  File size:       ${fileSizeMB} MB`);
  console.log(`  Total queries:   ${dataset.length.toLocaleString()}`);
  console.log(`  Total count sum: ${totalCount.toLocaleString()}`);
  console.log(`  Average count:   ${avgCount}`);
  console.log(`  Median count:    ${medianCount}`);
  console.log();
  console.log('  Distribution Breakdown:');
  console.log(`    Head   (≥50k):      ${head.length.toLocaleString().padStart(7)} queries`);
  console.log(`    Torso  (5k–50k):    ${torso.length.toLocaleString().padStart(7)} queries`);
  console.log(`    Body   (100–5k):    ${body.length.toLocaleString().padStart(7)} queries`);
  console.log(`    Tail   (<100):      ${tail.length.toLocaleString().padStart(7)} queries`);
  console.log();
  console.log('  Top 10 queries:');
  dataset.slice(0, 10).forEach((d, i) => {
    console.log(`    ${(i + 1).toString().padStart(3)}. "${d.query}" → ${d.count.toLocaleString()}`);
  });
  console.log();
  console.log('  Sample tail queries:');
  dataset.slice(-5).forEach((d) => {
    console.log(`         "${d.query}" → ${d.count}`);
  });
  console.log();
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Done. Dataset ready for typeahead system ingestion.');
  console.log('═══════════════════════════════════════════════════════');
}

main();
