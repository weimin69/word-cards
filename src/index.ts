import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { buildQuiz } from "./quiz.js";
import { createCard, loadWords, saveWords } from "./store.js";
import type { WordCard } from "./types.js";
import { LINE, style } from "./ui.js";

/**
 * 单词卡：一个纯终端的小项目。
 *
 * 用到的 TypeScript / Node 知识：
 * - interface 描述数据结构，函数参数和返回值都有类型
 * - async/await 读写文件
 * - 数组的 map / filter / reduce / findIndex / sort
 * - while + switch 做菜单循环
 * - readline/promises 读取用户输入
 */

/**
 * 等数据加载完再创建 readline。
 * 这样用管道喂输入时（例如 `printf "0\n" | npm start`），stdin 里的内容不会
 * 在 await 期间就被读完并触发 close。
 */
let rl: ReturnType<typeof createInterface>;

/** 输入流结束（Ctrl+D 或管道关闭）时用它跳出菜单循环。 */
class InputClosedError extends Error {
  constructor() {
    super("输入已结束");
    this.name = "InputClosedError";
  }
}

async function ask(prompt: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const onClose = (): void => {
      rl.off("close", onClose);
      // 延后一个事件循环，让「最后一行输入」先完成解析，再判定为 EOF。
      setImmediate(() => reject(new InputClosedError()));
    };

    rl.once("close", onClose);

    const handleAnswer = (answer: string): void => {
      rl.off("close", onClose);
      resolve(answer.trim());
    };

    const handleError = (error: unknown): void => {
      rl.off("close", onClose);
      reject(isReadlineClosed(error) ? new InputClosedError() : error);
    };

    try {
      rl.question(prompt).then(handleAnswer, handleError);
    } catch (error) {
      handleError(error);
    }
  });
}

function isReadlineClosed(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE"
  );
}

function printBanner(): void {
  console.log();
  console.log(style.bold("  单词卡 · WordCards"));
  console.log(style.dim("  在终端里管理生词，随机抽题测验，数据存在本地。"));
}

function printMenu(words: WordCard[]): void {
  console.log();
  console.log(style.dim(`  ${LINE}`));
  console.log(style.dim(`  ${words.length} 个单词 · data/words.json`));
  console.log(style.dim(`  ${LINE}`));
  console.log("  1  浏览单词        2  添加单词");
  console.log("  3  开始测验        4  删除单词");
  console.log("  5  学习统计        0  退出");
  console.log();
}

function accuracy(correct: number, wrong: number): number {
  const total = correct + wrong;
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function listWords(words: WordCard[]): void {
  if (words.length === 0) {
    console.log(style.yellow("  单词本是空的，先添加一个吧。"));
    return;
  }

  const sorted = [...words].sort((a, b) => {
      const aTotal = a.correct + a.wrong;
      const bTotal = b.correct + b.wrong;

      // 还没测验过的排最前面
      if (aTotal === 0 && bTotal === 0) return a.word.localeCompare(b.word);
      if (aTotal === 0) return -1;
      if (bTotal === 0) return 1;

      // 正确率低的排前面
      return accuracy(a.correct, a.wrong) - accuracy(b.correct, b.wrong);
    });

  console.log(style.bold(`  共 ${words.length} 个单词`));
  console.log();

  for (const [index, card] of sorted.entries()) {
    const number = String(index + 1).padStart(2, "0");
    const record =
      card.correct + card.wrong === 0
        ? "未测验"
        : `正确率 ${accuracy(card.correct, card.wrong)}%`;


      console.log(
        `  ${style.dim(number)}  ${style.bold(card.word.padEnd(18))} ${card.meaning}  ${style.dim(record)}`,
      );

  }
}

async function addWord(words: WordCard[]): Promise<void> {
  const word = await ask("  英文单词 > ");
  if (!word) {
    console.log(style.yellow("  已取消。"));
    return;
  }

  if (word.length > 30) {
    console.log(style.yellow(" 哦不，没有这么长的单词。"));
    return;
  }

  const exists = words.some(
    (card) => card.word.toLowerCase() === word.toLowerCase(),
  );
  if (exists) {
    console.log(style.yellow(`  「${word}」已经在单词本里了。`));
    return;
  }

  const meaning = await ask("  中文意思 > ");
  if (!meaning) {
    console.log(style.yellow("  已取消。"));
    return;
  }

  if (meaning.length > 40) {
    console.log(style.yellow("  中文意思太长了，请控制在 40 个字符以内。"));
    return;
  }

  const example = await ask("  例句（可留空） > ");
  if (example.length > 120) {
    console.log(style.yellow("  例句太长了，请控制在 120 个字符以内。"));
    return;
  }

  words.push(createCard({ word, meaning, example }));
  await saveWords(words);

  console.log(
    style.green(`  ✓ 已添加「${word}」，现在共 ${words.length} 个单词。`),
  );
}

async function deleteWord(words: WordCard[]): Promise<void> {
  if (words.length === 0) {
    console.log(style.yellow("  单词本是空的，没有可删除的内容。"));
    return;
  }

  listWords(words);
  console.log();
  const input = await ask("  输入要删除的单词（输入 0 取消） > ");

  if (!input || input === "0") {
    console.log(style.dim("  已取消。"));
    return;
  }

  const index = words.findIndex(
    (card) => card.word.toLowerCase() === input.toLowerCase(),
  );

  if (index === -1) {
    console.log(style.yellow(`  没有找到「${input}」。`));
    return;
  }

  const [removed] = words.splice(index, 1);
  await saveWords(words);
  console.log(style.green(`  ✓ 已删除「${removed.word}」。`));
}

function showStats(words: WordCard[]): void {
  const correct = words.reduce((sum, card) => sum + card.correct, 0);
  const wrong = words.reduce((sum, card) => sum + card.wrong, 0);
  const answered = correct + wrong;
  const quizzed = words.filter((card) => card.correct + card.wrong > 0).length;

  console.log(style.bold("  学习统计"));
  console.log();
  console.log(`  单词总数：${words.length}`);
  console.log(`  测验过的单词：${quizzed}`);
  console.log(`  累计答题：${answered}（对 ${correct} / 错 ${wrong}）`);
  console.log(
    `  总正确率：${answered === 0 ? "—" : `${accuracy(correct, wrong)}%`}`,
  );

  const hardest = [...words]
    .filter((card) => card.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || a.correct - b.correct)
    .slice(0, 3);

  if (hardest.length === 0) {
    console.log();
    console.log(style.dim("  还没有错题记录，先去测验几轮吧。"));
    return;
  }

  console.log();
  console.log(style.yellow("  最需要复习："));
  for (const card of hardest) {
    console.log(
      `  · ${style.bold(card.word)}  ${style.dim(`${card.correct} 对 / ${card.wrong} 错`)}`,
    );
  }
}

async function runQuiz(words: WordCard[]): Promise<void> {
  if (words.length < 2) {
    console.log(style.yellow("  至少要有 2 个单词才能开始测验。"));
    return;
  }

  const questions = buildQuiz(words, 5);

  console.log(style.bold(`  开始测验 · 共 ${questions.length} 题`));
  console.log(style.dim("  根据英文单词，选出正确的中文意思。"));
  console.log();

  let score = 0;

  for (const [index, question] of questions.entries()) {
    console.log(style.dim(`  第 ${index + 1} / ${questions.length} 题`));
    console.log();
    console.log(`    ${style.bold(style.cyan(question.card.word))}`);
    console.log();

    for (const [optionIndex, option] of question.options.entries()) {
      console.log(`    ${style.dim(`${optionIndex + 1}.`)} ${option}`);
    }

    console.log();

    let chosen = -1;
    while (chosen < 0) {
      const input = await ask("  你的答案 > ");
      const parsed = Number(input);

      if (
        Number.isInteger(parsed) &&
        parsed >= 1 &&
        parsed <= question.options.length
      ) {
        chosen = parsed - 1;
      } else {
        console.log(
          style.yellow(`  请输入 1 到 ${question.options.length} 之间的数字。`),
        );
      }
    }

    if (chosen === question.answerIndex) {
      score += 1;
      question.card.correct += 1;
      console.log(style.green("  ✓ 回答正确"));
    } else {
      question.card.wrong += 1;
      console.log(style.red(`  ✗ 正确答案：${question.card.meaning}`));
      if (question.card.example) {
        console.log(style.dim(`    例句：${question.card.example}`));
      }
    }

    console.log();
  }

  await saveWords(words);

  const percent = Math.round((score / questions.length) * 100);
  const comment =
    percent === 100
      ? "全对，漂亮！"
      : percent >= 60
        ? "不错，把错的单词再看两眼。"
        : "慢慢来，把错题多过几遍。";

  console.log(style.bold(`  本轮得分：${score} / ${questions.length}（${percent}%）`));
  console.log(style.dim(`  ${comment}`));
}

async function main(): Promise<void> {
  const words = await loadWords();

  rl = createInterface({ input: stdin, output: stdout });
  rl.on("SIGINT", () => {
    rl.close();
    console.log("\n  已退出。");
    process.exit(0);
  });

  printBanner();

  while (true) {
    printMenu(words);
    const choice = await ask(style.cyan("  请选择 > "));
    console.log();

    switch (choice) {
      case "1":
        listWords(words);
        break;
      case "2":
        await addWord(words);
        break;
      case "3":
        await runQuiz(words);
        break;
      case "4":
        await deleteWord(words);
        break;
      case "5":
        showStats(words);
        break;
      case "0":
        rl.close();
        console.log("  再见，记得复习 👋");
        return;
      default:
        console.log(style.yellow("  请输入 0 到 5 之间的数字。"));
    }
  }
}

main().catch((error: unknown) => {
  if (error instanceof InputClosedError) {
    console.log("\n  输入已结束，程序退出。");
    process.exit(0);
  }

  if (error instanceof Error && error.name === "AbortError") {
    console.log("\n  已退出。");
    process.exit(0);
  }

  console.error(style.red("\n  程序出错："), error);
  process.exit(1);
});
