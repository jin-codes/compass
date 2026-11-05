export type Kind = "challenge" | "activity" | "contest" | "support";

export type Equipment = "phone" | "laptop" | "special";

export interface Item {
  id: string;
  kind: Kind;
  name: string;
  /** 무엇을 하는지 */
  summary: string;
  /** 해보면 배울 수 있는 것 */
  learns: string;
  /** 흥미 분야 태그 */
  fields: string[];
  /** 가치관 태그 (직업이 아니라 "무엇을 중요하게 여기는가") */
  values: string[];
  /** 원화. 0이면 무료 */
  costKrw: number;
  costNote?: string;
  /** 주당 예상 시간 */
  hoursPerWeek: number;
  equipment: Equipment;
  /** ISO 날짜(YYYY-MM-DD). 없으면 상시 */
  deadline?: string;
  eligibility?: string;
  /** 같은 것을 배울 수 있는 더 싼 경로의 item id */
  cheaperAltId?: string;
  /** external(activity/contest/support)은 출처와 확인일이 필수 */
  sourceUrl?: string;
  lastChecked?: string;
  /** Jin이 확인하고 게시한 항목만 true */
  verified: boolean;
  /** 개발용 샘플. 실제 정보가 아님 */
  sample?: boolean;
}

export type Budget = 0 | 30000 | 100000 | -1; // -1: 제한 없음

export interface Constraints {
  budget: Budget;
  hoursPerWeek: number;
  equipment: Equipment;
}

export interface Answers {
  fields: string[];
  values: string[];
  constraints: Constraints;
}

export interface Recommendation {
  item: Item;
  score: number;
  matchedFields: string[];
  matchedValues: string[];
  cheaperAlt?: Item;
}

export interface Result {
  within: Recommendation[];
  /** 예산을 넘지만 지원받으면 가능한 길 */
  withSupport: Recommendation[];
  /** 지원 안내 (support 종류) */
  supports: Item[];
}
