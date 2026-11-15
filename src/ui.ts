/**
 * 终端里的小工具函数：颜色和分隔线。
 * 当输出被管道接走（比如写进文件或在测试里）时自动关闭颜色，
 * 避免文件里出现一堆 \u001b[32m 这样的转义字符。
 */

const supportsColor =
  process.stdout.isTTY === true && process.env.NO_COLOR === undefined;

function paint(open: number, close: number): (text: string) => string {
  return (text) => (supportsColor ? `\u001b[${open}m${text}\u001b[${close}m` : text);
}

export const style = {
  bold: paint(1, 22),
  dim: paint(2, 22),
  green: paint(32, 39),
  red: paint(31, 39),
  yellow: paint(33, 39),
  cyan: paint(36, 39),
};

export const LINE = "─".repeat(46);
