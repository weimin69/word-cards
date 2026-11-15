/** 一张单词卡的全部信息。 */
export interface WordCard {
  id: string;
  /** 英文单词或短语。 */
  word: string;
  /** 中文意思。 */
  meaning: string;
  /** 例句，可以为空字符串。 */
  example: string;
  /** 创建时间，ISO 8601 字符串。 */
  createdAt: string;
  /** 测验答对次数。 */
  correct: number;
  /** 测验答错次数。 */
  wrong: number;
}

/** 新增单词时只需要这三项，其余字段由 createCard 补全。 */
export interface NewWord {
  word: string;
  meaning: string;
  example?: string;
}
