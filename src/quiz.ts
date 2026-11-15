import type { WordCard } from "./types.js";

/** 一道四选一（词少时可能只有两三个选项）的测验题。 */
export interface QuizQuestion {
  card: WordCard;
  options: string[];
  /** 正确选项在 options 中的下标。 */
  answerIndex: number;
}

/**
 * 随机抽题：每题用「正确意思 + 其他单词的意思」组成选项。
 * 纯函数：不读写文件、不打印，输入相同（随机数除外）则输出结构相同，方便测试。
 */
export function buildQuiz(words: WordCard[], count = 5): QuizQuestion[] {
  if (words.length < 2) return [];

  const picked = shuffle(words).slice(0, Math.min(count, words.length));

  return picked.map((card) => {
    const otherMeanings = [
      ...new Set(
        words
          .filter((item) => item.id !== card.id)
          .map((item) => item.meaning)
          .filter((meaning) => meaning !== card.meaning),
      ),
    ];

    const distractors = shuffle(otherMeanings).slice(0, 3);
    const options = shuffle([card.meaning, ...distractors]);

    return {
      card,
      options,
      answerIndex: options.indexOf(card.meaning),
    };
  });
}

/** Fisher–Yates 洗牌，返回新数组，不修改原数组。 */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}
