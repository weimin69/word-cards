# 单词卡 · WordCards

一个纯终端的 TypeScript 练手项目：管理自己的生词本，随机抽题测验，学习记录保存在本地 JSON 文件里。

没有服务器、没有浏览器、没有网络请求，也没有前端框架。只有 Node.js + TypeScript，以及一个可以直接打开看的 `data/words.json`。

## 功能

- 浏览单词本，显示每个单词的测验正确率
- 添加、删除单词（自动查重）
- 随机抽 5 题，四选一测验；答错时显示例句
- 统计答题数量、总正确率、最需要复习的单词
- 学习记录持久化，关掉终端再打开还在
- 首次运行自动生成 10 个示例单词

## 运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm start
```

首次启动会创建 `data/words.json`。然后按菜单里的数字操作：

```text
  单词卡 · WordCards
  在终端里管理生词，随机抽题测验，数据存在本地。

  ──────────────────────────────────────────────
  10 个单词 · data/words.json
  ──────────────────────────────────────────────
  1  浏览单词        2  添加单词
  3  开始测验        4  删除单词
  5  学习统计        0  退出
```

其他命令：

| 命令 | 作用 |
| --- | --- |
| `npm start` | 运行程序 |
| `npm run dev` | 监听文件变化，改完代码自动重启 |
| `npm run typecheck` | 只检查类型，不生成文件 |
| `npm run build` | 编译到 `dist/`，之后可以 `node dist/index.js` |

## 目录结构

```text
src/
  index.ts    菜单循环、用户输入、浏览/添加/删除/测验/统计的流程
  store.ts    读写 data/words.json、创建卡片、示例单词
  quiz.ts     随机抽题、生成选项、洗牌（纯函数，不碰文件）
  types.ts    WordCard / NewWord 类型定义
  ui.ts       ANSI 颜色和分隔线
data/
  words.json  第一次运行时生成，记录所有单词和学习数据
```

## 它是怎么跑起来的

### 启动

1. `loadWords()` 读取 `data/words.json`；文件不存在就写入示例单词。
2. 创建 `readline` 接口，用 `await ask("请选择 > ")` 一行一行读用户输入。
3. `while (true)` + `switch` 根据数字调用对应函数，处理完再回到菜单。

### 添加一个单词

```text
输入 2
  → 依次询问单词、中文意思、例句
  → createCard() 补上 id、创建时间和 correct/wrong 计数
  → words.push(card)
  → saveWords() 写回 JSON
```

### 一次测验

```text
buildQuiz(words, 5)
  → 随机挑 5 个单词
  → 每个单词拿「正确意思 + 其他 3 个单词的意思」组成 4 个选项
  → 逐题作答，答对 correct + 1，答错 wrong + 1
  → 全部答完后 saveWords() 保存战绩
```

## 这个项目里的 TypeScript

| 知识点 | 可以看哪里 |
| --- | --- |
| `interface`、可选属性 `example?` | `src/types.ts` |
| 泛型 `shuffle<T>`、`ReturnType<typeof ...>` | `src/quiz.ts`、`src/index.ts` |
| 类型守卫 / 类型收窄 | `isNotFound`、`isReadlineClosed` |
| `async` / `await` 与 `fs/promises` | `src/store.ts`、`src/index.ts` |
| 手动创建 `Promise` | `ask()` 里处理输入关闭 |
| 数组 `map` / `filter` / `reduce` / `findIndex` / `sort` / `entries` | 几乎每个功能都有 |
| ES Module 与导入路径的 `.js` 后缀 | 所有 `import` |
| `strict` 严格模式 | `tsconfig.json` |

## 练手任务

从易到难，建议一次挑一个：

1. **按正确率排序**：在浏览单词时，把正确率低的排在前面（`sort`）。
2. **清空学习记录**：新增一个菜单项，把所有单词的 `correct` / `wrong` 重置为 0，重置前先让用户确认。
3. **只测错题**：开始测验时先筛选 `wrong > 0` 的单词，只从错题里抽题。
4. **反向测验**：改成「看中文选英文」，复用 `buildQuiz`，只是把问题和选项对调。
5. **编辑单词**：新增修改中文意思或例句的功能，注意处理找不到单词的情况。
6. **记录测验历史**：把每轮得分和日期追加到 `data/history.json`，统计最近 5 轮的平均分。
7. **给 `buildQuiz` 写测试**：用 `node:test` 检查每题都有正确选项、选项不重复、答案下标正确。
8. **更稳的写文件**：先写临时文件再 `rename`，避免程序中途退出时把 JSON 写坏；顺便给加载的数据加校验。

改完代码如果类型报错，先运行 `npm run typecheck` 看看具体位置。

## 数据长什么样

`data/words.json` 就是一个数组，可以直接用编辑器打开：

```json
[
  {
    "id": "603fcdf9-be74-4ee3-ba08-1b3d7c85a209",
    "word": "serendipity",
    "meaning": "意外发现美好事物的运气",
    "example": "Finding that little bookshop was pure serendipity.",
    "createdAt": "2026-11-15T00:53:27.306Z",
    "correct": 2,
    "wrong": 1
  }
]
```

## 常见问题

- **想重新开始**：删掉 `data/words.json`，下次启动会重新生成 10 个示例单词。
- **想换示例单词**：修改 `src/store.ts` 里的 `SEED_WORDS`。注意它只对「第一次生成数据文件」生效。
- **颜色太花/不支持**：运行 `NO_COLOR=1 npm start` 可以关闭颜色。
- **`npm install` 提示缓存权限错误**：用项目内缓存安装即可：`npm install --cache .npm-cache`。
- **输入中文没问题吗**：可以，菜单和单词都支持中文，按正常方式输入后回车即可。

## 为什么没有网络请求

这是一个打基础的小项目，刻意把范围缩小到语言本身：类型、异步、文件读写、数组操作、终端交互。把这几个练熟之后，再去写 HTTP 服务或 Web 前端会轻松很多。
