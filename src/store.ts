import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NewWord, WordCard } from "./types.js";

/**
 * 数据层：只负责「读文件、写文件、造一张卡片」，不关心菜单和界面。
 * 数据放在项目根目录的 data/words.json 里，换台电脑也能带着走。
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "words.json");

/** 第一次运行时自动写入的示例单词，方便马上体验测验。 */
const SEED_WORDS: NewWord[] = [
  {
    word: "serendipity",
    meaning: "意外发现美好事物的运气",
    example: "Finding that little bookshop was pure serendipity.",
  },
  {
    word: "resilient",
    meaning: "有韧性的；能迅速恢复的",
    example: "Children are often more resilient than adults expect.",
  },
  {
    word: "concise",
    meaning: "简洁的；言简意赅的",
    example: "Try to keep your answer concise.",
  },
  {
    word: "thrive",
    meaning: "茁壮成长；蓬勃发展",
    example: "These plants thrive in warm, wet weather.",
  },
  {
    word: "ambiguous",
    meaning: "模棱两可的；含糊不清的",
    example: "His answer was deliberately ambiguous.",
  },
  {
    word: "diligent",
    meaning: "勤奋的；用功的",
    example: "She is a diligent student who never misses class.",
  },
  {
    word: "empathy",
    meaning: "同理心；共情",
    example: "Good doctors show empathy as well as skill.",
  },
  {
    word: "inevitable",
    meaning: "不可避免的",
    example: "Change is inevitable; complaining is optional.",
  },
  {
    word: "lucid",
    meaning: "清晰易懂的；头脑清醒的",
    example: "He gave a lucid explanation of the problem.",
  },
  {
    word: "wander",
    meaning: "漫步；闲逛",
    example: "We wandered through the old town for hours.",
  },
];

/**
 * 读取单词。文件不存在时，自动创建 data/words.json 并写入示例单词。
 */
export async function loadWords(): Promise<WordCard[]> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("data/words.json 的内容必须是一个数组");
    }

    return parsed as WordCard[];
  } catch (error) {
    if (isNotFound(error)) {
      const words = SEED_WORDS.map(createCard);
      await saveWords(words);
      return words;
    }

    throw error;
  }
}

/** 用 2 空格缩进写出 JSON，方便直接打开文件看数据。 */
export async function saveWords(words: WordCard[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(words, null, 2)}\n`, "utf8");
}

/** 把用户输入变成一张完整的单词卡。 */
export function createCard(input: NewWord): WordCard {
  return {
    id: randomUUID(),
    word: input.word,
    meaning: input.meaning,
    example: input.example ?? "",
    createdAt: new Date().toISOString(),
    correct: 0,
    wrong: 0,
  };
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
