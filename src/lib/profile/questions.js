export const QUIZ_QUESTIONS = [
  {
    field: "yarnType",
    question: "What's your yarn type?",
    options: [
      "Soft and squishy",
      "Natural and sophisticated",
      "Cheap and available",
      "Colorful and bold",
      "Everything — yarn is yarn!",
    ],
  },
  {
    field: "crochetLoveLanguage",
    question: "What's your crochet love language?",
    options: [
      "Buying yarn",
      "Receiving yarn",
      "Uninterrupted crochet time",
      "Compliments on my work",
      "Someone weaving in my ends",
      "Teaching someone new",
    ],
  },
  {
    field: "idealFirstDate",
    question: "What is your ideal first date?",
    options: [
      "A yarn shop",
      "A craft fair",
      "Home with a WIP & wine",
      "Coffee and crocheting together",
      "A blanket and a movie",
    ],
  },
  {
    field: "crochetKnittingOpinion",
    question: "Could you have a serious relationship with someone who calls crochet \u201cknitting\u201d?",
    options: ["Yes", "No", "It's complicated\u2026"],
  },
  {
    field: "idealHookBrand",
    question: "What's your ideal hook-up?",
    options: ["Clover", "Tulip", "Furls", "JinLan", "Whatever's within reach"],
  },
  {
    field: "onlineYarnLetdown",
    question: "Ever fallen in love with a yarn online, only to be disappointed in person?",
    options: ["Guilty", "Innocent", "All the time!", "Never"],
  },
  {
    field: "yarnAttraction",
    question: "What's more attractive?",
    options: ["Gorgeous color", "Incredible softness", "A really good price"],
  },
  {
    field: "luxuryVsBargain",
    question: "One luxurious skein you adore, or ten bargain skeins you might use someday?",
    options: [
      "One luxurious skein I adore",
      "Ten bargain skeins",
      "Both!",
    ],
  },
  {
    field: "longestUFO",
    question: "What's the longest relationship you've had with a UFO (Unfinished Object)?",
    options: [
      "Under a month",
      "A few months",
      "Over a year",
      "It's basically furniture now",
    ],
  },
  {
    field: "weekendProject",
    question: "Long-term project, or something quick and easy for the weekend?",
    options: [
      "A long-term project",
      "Something quick for the weekend",
      "Both — I start 10, finish 1",
    ],
  },
];

export const QUIZ_LABELS = {
  yarnType: "Yarn type",
  crochetLoveLanguage: "Crochet love language",
  idealFirstDate: "Ideal first date",
  crochetKnittingOpinion: "Crochet vs. knitting",
  idealHookBrand: "Ideal hook-up",
  onlineYarnLetdown: "Online yarn letdown",
  yarnAttraction: "What I find attractive",
  luxuryVsBargain: "Luxury or bargain",
  longestUFO: "Longest UFO relationship",
  weekendProject: "Project style",
};

export function quizHasAnswers(member) {
  return QUIZ_QUESTIONS.some((q) => (member?.[q.field] || "").trim());
}

export function quizAnswers(member) {
  if (!member) return {};
  return QUIZ_QUESTIONS.reduce((acc, q) => {
    acc[q.field] = (member[q.field] || "").trim();
    return acc;
  }, {});
}