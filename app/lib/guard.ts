/**
 * 비용 방어. 서버리스 인스턴스마다 메모리가 따로라 이 제한은 인스턴스 안에서만 정확하다.
 * 전체를 아우르는 상한은 Vercel 방화벽의 속도 제한과 Anthropic 콘솔의 월 한도가 맡는다.
 */
export interface GuardLimits {
  /** IP당 분당 요청 수 (AI 여부와 상관없이) */
  perIpPerMinute: number;
  /** IP당 하루 AI 호출 수 */
  perIpAiPerDay: number;
  /** 인스턴스당 시간당 AI 호출 수 */
  aiPerHour: number;
}

export type GuardVerdict = "ai" | "keyword" | "blocked";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_TRACKED_IPS = 5000;

export function createGuard(limits: GuardLimits, now: () => number = Date.now) {
  const requests = new Map<string, number[]>();
  const aiByIp = new Map<string, number[]>();
  let aiCalls: number[] = [];

  const recent = (xs: number[] | undefined, span: number, t: number) =>
    (xs ?? []).filter((x) => t - x < span);

  /**
   * "blocked": 너무 자주 눌렀다. 거절한다.
   * "keyword": 서비스는 하되 AI는 쓰지 않는다 (하루 한도나 시간당 예산을 넘음).
   * "ai": AI를 써도 된다. 이 판정을 받으면 AI 호출 한 번이 기록된다.
   */
  return function check(ip: string): GuardVerdict {
    const t = now();
    if (requests.size > MAX_TRACKED_IPS) requests.clear();
    if (aiByIp.size > MAX_TRACKED_IPS) aiByIp.clear();

    const reqs = recent(requests.get(ip), MINUTE, t);
    reqs.push(t);
    requests.set(ip, reqs);
    if (reqs.length > limits.perIpPerMinute) return "blocked";

    aiCalls = recent(aiCalls, HOUR, t);
    const mine = recent(aiByIp.get(ip), DAY, t);
    if (mine.length >= limits.perIpAiPerDay || aiCalls.length >= limits.aiPerHour) {
      aiByIp.set(ip, mine);
      return "keyword";
    }
    mine.push(t);
    aiByIp.set(ip, mine);
    aiCalls.push(t);
    return "ai";
  };
}
