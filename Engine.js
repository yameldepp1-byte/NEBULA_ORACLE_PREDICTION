const n = (x) => Number.parseInt(x, 10);
export const classifySize = (value) => n(value) >= 5 ? "BIG" : "SMALL";
export const classifyColor = (value) => {
  const x = n(value);
  if ([0, 5].includes(x)) return "VIOLET";
  return x % 2 === 0 ? "RED" : "GREEN";
};

const clamp = (v, a=0, b=100) => Math.max(a, Math.min(b, v));

export function predict(history) {
  const nums = history.map(x => n(x.number)).filter(Number.isFinite).slice(0, 30);
  if (nums.length < 5) return { size: "NEUTRAL", color: "NEUTRAL", confidence: 0, reasons: ["Waiting for live history"] };

  const recent = nums.slice(0, 12);
  const big = recent.filter(x => x >= 5).length;
  const even = recent.filter(x => x % 2 === 0).length;
  const violet = recent.filter(x => x === 0 || x === 5).length;

  const size = big >= recent.length / 2 ? "BIG" : "SMALL";
  const color = violet >= 2 ? "VIOLET" : (even >= recent.length / 2 ? "RED" : "GREEN");

  const sizeBalance = Math.abs(big / recent.length - 0.5);
  const colorBalance = Math.abs(even / recent.length - 0.5);
  const confidence = Math.round(clamp(50 + (sizeBalance + colorBalance) * 55));

  return {
    size,
    color,
    confidence,
    reasons: [
      `${big}/${recent.length} recent values are BIG`,
      `${even}/${recent.length} recent values are even`,
      `${violet} recent VIOLET values`,
      "Heuristic ensemble — not a guaranteed forecast"
    ]
  };
}

export function evaluate(prediction, actual) {
  const size = classifySize(actual.number);
  const color = classifyColor(actual.number);
  return {
    size,
    color,
    sizeWin: prediction.size === size,
    colorWin: prediction.color === color,
    win: prediction.size === size || prediction.color === color
  };
}
