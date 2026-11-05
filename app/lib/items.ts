import type { Item } from "./types";

export const FIELD_OPTIONS = [
  "데이터·분석",
  "소프트웨어·만들기",
  "글·콘텐츠",
  "디자인·시각",
  "사람·상담",
  "과학·실험",
  "사회·환경 문제",
  "기획·창업",
];

export const VALUE_OPTIONS = [
  "누군가를 돕는 일",
  "깊이 파고드는 탐구",
  "직접 만들어 내놓기",
  "나를 표현하기",
  "함께 만들기",
  "안정과 예측 가능함",
];

/**
 * 추천은 이 목록 안에서만 한다.
 * - kind === "challenge": 외부 정보가 아니라 스스로 해보는 도전. 출처가 필요 없다.
 * - 그 외(activity / contest / support): sourceUrl, lastChecked, verified가 있어야 게시된다.
 * - sample === true 는 개발용이다. 실제 프로그램·가격·마감이 아니다.
 *
 * 실제 외부 항목은 Jin이 수집·검수한 뒤 여기에 추가한다. 지어내지 않는다.
 */
export const ITEMS: Item[] = [
  {
    id: "c-open-data-question",
    kind: "challenge",
    name: "공개 데이터로 궁금한 질문 하나 풀어보기",
    summary:
      "내 주변에서 궁금한 것 하나를 정하고, 공개된 데이터를 찾아 표 하나와 한 문단 결론으로 정리해본다.",
    learns: "질문 세우기, 데이터 찾기, 근거로 말하기",
    fields: ["데이터·분석", "사회·환경 문제"],
    values: ["깊이 파고드는 탐구"],
    costKrw: 0,
    hoursPerWeek: 3,
    equipment: "laptop",
    verified: true,
  },
  {
    id: "c-tiny-tool",
    kind: "challenge",
    name: "내가 쓸 작은 도구 하나 만들어보기",
    summary:
      "불편했던 일 하나를 골라, 하루면 쓸 수 있을 만큼 작은 웹페이지나 스크립트로 만들어본다.",
    learns: "문제 쪼개기, 만들고 고치기, 결과 공유하기",
    fields: ["소프트웨어·만들기", "기획·창업"],
    values: ["직접 만들어 내놓기"],
    costKrw: 0,
    hoursPerWeek: 4,
    equipment: "laptop",
    verified: true,
  },
  {
    id: "c-interview",
    kind: "challenge",
    name: "관심 분야에서 일하는 사람 한 명에게 20분 묻기",
    summary:
      "질문 다섯 개를 준비해 한 명에게 메시지를 보내고, 들은 것을 내 말로 정리한다.",
    learns: "질문하기, 일의 실제 모습 알기, 내가 끌리는 지점 찾기",
    fields: ["사람·상담", "기획·창업", "사회·환경 문제"],
    values: ["누군가를 돕는 일", "깊이 파고드는 탐구"],
    costKrw: 0,
    hoursPerWeek: 2,
    equipment: "phone",
    verified: true,
  },
  {
    id: "c-writing",
    kind: "challenge",
    name: "내가 관찰한 것 한 편으로 써서 공개하기",
    summary:
      "한 주 동안 눈에 띈 것을 기록하고, 800자 안팎의 글이나 사진 한 세트로 만들어 공개한다.",
    learns: "관찰, 구조 잡기, 반응 받아보기",
    fields: ["글·콘텐츠", "디자인·시각"],
    values: ["나를 표현하기"],
    costKrw: 0,
    hoursPerWeek: 2,
    equipment: "phone",
    verified: true,
  },
  {
    id: "c-home-experiment",
    kind: "challenge",
    name: "집에서 가설 하나 세우고 실험해보기",
    summary:
      "생활 속 궁금증을 가설로 바꾸고, 조건을 하나만 바꿔 열흘 동안 측정한 뒤 기록한다.",
    learns: "가설 세우기, 변수 통제, 기록 습관",
    fields: ["과학·실험", "데이터·분석"],
    values: ["깊이 파고드는 탐구"],
    costKrw: 0,
    costNote: "집에 있는 재료로 가능",
    hoursPerWeek: 2,
    equipment: "phone",
    verified: true,
  },
  {
    id: "c-team-zine",
    kind: "challenge",
    name: "친구 두세 명과 한 주제로 소책자 만들기",
    summary:
      "주제 하나를 정하고 역할을 나눠 글과 그림을 모아 PDF 한 권으로 만든다.",
    learns: "역할 나누기, 편집, 마감 지키기",
    fields: ["글·콘텐츠", "디자인·시각", "기획·창업"],
    values: ["함께 만들기", "나를 표현하기"],
    costKrw: 0,
    hoursPerWeek: 3,
    equipment: "laptop",
    verified: true,
  },
];
