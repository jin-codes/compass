import { FIELD_OPTIONS, VALUE_OPTIONS } from "./items.ts";

/**
 * 표준 질문지. AI를 부르지 않는다. 점수나 유형을 내지 않고, 정답도 없다.
 * 고른 선택지는 분야·가치 태그로만 쓰이고 추천을 좁히는 데 들어간다. 모두 건너뛸 수 있다.
 * 질문은 "무엇을 해봤나"처럼 행동을 묻는 쪽으로 쓴다.
 */
export interface Option {
  label: string;
  values?: string[];
  fields?: string[];
}
export interface Question {
  id: string;
  q: string;
  /** 고를 수 있는 최대 개수 */
  max: number;
  options: Option[];
}
export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

const V = {
  help: "누군가를 돕는 일",
  dig: "깊이 파고드는 탐구",
  make: "직접 만들어 내놓기",
  self: "나를 표현하기",
  team: "함께 만들기",
  stable: "안정과 예측 가능함",
} as const;
const F = {
  data: "데이터·분석",
  sw: "소프트웨어·만들기",
  write: "글·콘텐츠",
  design: "디자인·시각",
  people: "사람·상담",
  sci: "과학·실험",
  social: "사회·환경 문제",
  biz: "기획·창업",
} as const;

const v = (label: string, value: keyof typeof V): Option => ({ label, values: [V[value]] });
const f = (label: string, field: keyof typeof F): Option => ({ label, fields: [F[field]] });
const q = (id: string, text: string, options: Option[], max = 2): Question => ({
  id,
  q: text,
  max,
  options,
});

export const SECTIONS: Section[] = [
  {
    id: "done",
    title: "해본 일",
    questions: [
      q(
        "flow",
        "최근에 시간 가는 줄 모르고 한 일은 어떤 모습에 가까웠어?",
        [
          v("혼자 끝까지 파고들었어", "dig"),
          v("뭔가를 만들어서 내놓았어", "make"),
          v("누군가를 도와주거나 이야기를 들어줬어", "help"),
          v("내 생각이나 느낌을 표현했어", "self"),
          v("여럿이 같이 해냈어", "team"),
          v("정해진 순서대로 차분히 해냈어", "stable"),
        ],
        3
      ),
      q("month", "지난 한 달 안에 스스로 시작한 일이 있다면 뭐였어?", [
        v("뭔가를 만들어서 올리거나 보여줬어", "make"),
        v("궁금한 걸 찾아서 끝까지 알아봤어", "dig"),
        v("친구 고민을 들어주거나 도와줬어", "help"),
        v("글·그림·영상으로 내 이야기를 했어", "self"),
        v("모임이나 프로젝트를 같이 했어", "team"),
        v("계획표나 정리 방식을 새로 짰어", "stable"),
      ]),
      q("finish", "끝까지 마무리해 본 일은 어떻게 해냈어?", [
        v("혼자서 만들어 완성했어", "make"),
        v("같이 하면서 완성했어", "team"),
        v("오래 파고들어서 이해했어", "dig"),
        v("매일 조금씩 이어서 했어", "stable"),
        v("보여주고 싶은 사람이 있어서 했어", "self"),
        v("누군가에게 도움이 되려고 했어", "help"),
      ]),
      q("asked", "누가 부탁해서 도와준 적이 있다면 어떤 일이었어?", [
        f("자료나 숫자를 정리해 주는 일", "data"),
        f("컴퓨터·폰·앱 문제를 해결해 주는 일", "sw"),
        f("글을 고쳐 주거나 대신 써 주는 일", "write"),
        f("포스터·사진·꾸미기를 해 주는 일", "design"),
        f("고민을 들어주는 일", "people"),
        f("모르는 걸 설명해 주는 일", "sci"),
        f("학교나 동네의 불편한 점을 알리는 일", "social"),
        f("행사나 모임을 계획하는 일", "biz"),
      ]),
      q("share", "내가 한 일을 남에게 말했을 때 가장 좋았던 반응은?", [
        v("\"그거 어떻게 했어?\" 하고 궁금해했어", "make"),
        v("\"덕분에 도움이 됐어\"라고 했어", "help"),
        v("\"너다운 거네\"라고 했어", "self"),
        v("\"같이 해보자\"라고 했어", "team"),
        v("\"깊이 아네\"라고 했어", "dig"),
        v("\"꼼꼼하게 잘 챙기네\"라고 했어", "stable"),
      ]),
    ],
  },
  {
    id: "way",
    title: "하는 방식",
    questions: [
      q("stuck", "하던 일이 막혔을 때 보통 어떻게 해?", [
        v("될 때까지 혼자 더 파봐", "dig"),
        v("누군가에게 물어보고 같이 풀어", "team"),
        v("일단 다른 방법으로 만들어봐", "make"),
        v("순서를 다시 정리해서 천천히 가", "stable"),
      ]),
      q("learn", "새로운 걸 배울 때 가장 먼저 하는 건?", [
        v("일단 만져보고 해봐", "make"),
        v("원리부터 찾아봐", "dig"),
        v("잘하는 사람에게 물어봐", "team"),
        v("순서표나 계획을 만들어", "stable"),
        v("내 말로 정리해 적어봐", "self"),
        v("다른 사람에게 가르쳐 주면서 익혀", "help"),
      ]),
      q("task", "과제나 해야 할 일을 맡으면 보통 어떻게 시작해?", [
        v("계획부터 세워", "stable"),
        v("일단 시작해 보면서 고쳐", "make"),
        v("자료부터 많이 모아", "dig"),
        v("같이 할 사람을 찾아", "team"),
        v("나만의 방식으로 바꿔서 해", "self"),
      ]),
      q("surprise", "결과가 예상과 달랐을 때 먼저 하는 건?", [
        v("왜 그런지 이유를 파고들어", "dig"),
        v("바로 고쳐서 다시 만들어", "make"),
        v("다른 사람 의견을 들어봐", "team"),
        v("느낀 점을 적어 둬", "self"),
        v("순서나 조건을 바꿔서 다시 해봐", "stable"),
      ]),
      q("deadline", "마감이 다가오면 나는 어떻게 해?", [
        v("미리미리 끝내 둬", "stable"),
        v("막판에 몰입해서 만들어내", "make"),
        v("같이 하는 사람과 나눠서 해", "team"),
        v("더 파다가 시간이 모자라기도 해", "dig"),
        v("내가 만족할 때까지 다듬어", "self"),
      ]),
      q("together", "혼자 하는 것과 같이 하는 것 중, 해본 쪽에서 더 잘 맞았던 건?", [
        v("혼자 집중해서 하는 일", "dig"),
        v("둘셋이 짝을 이뤄 하는 일", "team"),
        v("여럿이 역할을 나눠 하는 일", "team"),
        v("남을 돕는 역할이 있는 일", "help"),
      ]),
    ],
  },
  {
    id: "pull",
    title: "끌리는 분야",
    questions: [
      q(
        "eyes",
        "요즘 자꾸 눈이 가는 건 뭐야?",
        [
          f("숫자·통계·그래프", "data"),
          f("앱·웹·코드로 만드는 것", "sw"),
          f("글, 영상, 콘텐츠", "write"),
          f("그림, 사진, 디자인", "design"),
          f("사람 이야기, 고민, 대화", "people"),
          f("실험하고 관찰하는 것", "sci"),
          f("사회나 환경의 불편한 점", "social"),
          f("아이디어를 사업이나 서비스로", "biz"),
        ],
        3
      ),
      q("search", "쉬는 시간에 자꾸 검색하게 되는 건?", [
        f("순위·통계·비교 자료", "data"),
        f("새 앱이나 만드는 법", "sw"),
        f("웹소설·블로그·에세이", "write"),
        f("인테리어·일러스트·사진", "design"),
        f("사람 심리나 관계 이야기", "people"),
        f("신기한 과학 현상", "sci"),
        f("뉴스 속 사회 문제", "social"),
        f("잘된 서비스나 창업 이야기", "biz"),
      ]),
      q("class", "수업에서 가장 손이 갔던 활동은?", [
        f("표나 그래프로 정리하기", "data"),
        f("코딩이나 만들기 수행평가", "sw"),
        f("글쓰기나 발표 준비", "write"),
        f("그리기, 꾸미기, 시각 자료", "design"),
        f("토론이나 상담 활동", "people"),
        f("실험이나 관찰 실습", "sci"),
        f("사회 문제 조사", "social"),
        f("아이디어 내서 기획하기", "biz"),
      ]),
      q("friends", "친구들이 나한테 자주 부탁하거나 물어보는 건?", [
        f("계산이나 자료 정리", "data"),
        f("기기·앱 쓰는 법", "sw"),
        f("글 고쳐 달라는 부탁", "write"),
        f("사진·디자인 부탁", "design"),
        f("고민 상담", "people"),
        f("모르는 개념 설명", "sci"),
        f("학교 일에 대한 의견", "social"),
        f("모임이나 이벤트 기획", "biz"),
      ]),
      q("free", "아무 제약 없는 반나절이 생기면 하고 싶은 건?", [
        f("데이터를 모아서 뭔가 알아내기", "data"),
        f("작은 프로그램이나 앱 만들기", "sw"),
        f("글이나 영상 만들기", "write"),
        f("그림 그리거나 사진 찍기", "design"),
        f("누군가와 깊은 얘기 나누기", "people"),
        f("궁금한 걸 실험해 보기", "sci"),
        f("동네나 학교 문제 알아보기", "social"),
        f("새로운 사업 아이디어 구상하기", "biz"),
      ]),
      q("feed", "뉴스나 SNS에서 눈이 멈추는 글은?", [
        f("조사·통계로 보여주는 글", "data"),
        f("새 기술이나 도구 소개", "sw"),
        f("잘 쓴 글이나 영상", "write"),
        f("눈에 띄는 디자인·사진", "design"),
        f("사람 이야기와 경험담", "people"),
        f("과학이나 자연 이야기", "sci"),
        f("환경·사회 이슈", "social"),
        f("새로 나온 서비스나 창업 소식", "biz"),
      ]),
      q("tools", "가장 자주 여는 앱이나 도구는?", [
        f("스프레드시트·계산기", "data"),
        f("코드 에디터나 만드는 도구", "sw"),
        f("메모·문서·블로그", "write"),
        f("사진·그림·편집 앱", "design"),
        f("메신저·통화", "people"),
        f("관찰 노트나 실험 기록", "sci"),
        f("뉴스·커뮤니티", "social"),
        f("캘린더·기획 노트", "biz"),
      ]),
      q("want", "해보고 싶은데 아직 못 해본 건?", [
        f("내 데이터를 직접 분석해 보기", "data"),
        f("내 앱이나 사이트 만들기", "sw"),
        f("내 글이나 영상 올리기", "write"),
        f("내 작품 전시하거나 공개하기", "design"),
        f("사람들 이야기를 들어보는 인터뷰", "people"),
        f("나만의 실험 설계하기", "sci"),
        f("문제 하나를 직접 바꿔보기", "social"),
        f("작게라도 서비스나 팀 시작하기", "biz"),
      ]),
      q("problem", "어떤 문제가 풀리면 가장 신날 것 같아?", [
        f("숫자 속에서 패턴을 찾아내는 문제", "data"),
        f("불편한 걸 코드로 해결하는 문제", "sw"),
        f("말로 잘 전하는 문제", "write"),
        f("보기 좋게 만드는 문제", "design"),
        f("사람 마음을 이해하는 문제", "people"),
        f("왜 그런지 원리를 알아내는 문제", "sci"),
        f("많은 사람에게 영향을 주는 문제", "social"),
        f("사람들이 필요로 하는 걸 찾아내는 문제", "biz"),
      ]),
    ],
  },
  {
    id: "value",
    title: "중요하게 여기는 것",
    questions: [
      q("proud", "뿌듯했던 순간은 언제였어?", [
        v("끝까지 깊이 이해했을 때", "dig"),
        v("만든 걸 세상에 내놓았을 때", "make"),
        v("누군가에게 도움이 됐을 때", "help"),
        v("내 이야기가 잘 전해졌을 때", "self"),
        v("같이 한 일이 잘 끝났을 때", "team"),
        v("계획대로 차질 없이 해냈을 때", "stable"),
      ]),
      q("used", "내가 한 일이 어디에 쓰였으면 좋겠어?", [
        v("누군가의 어려움을 덜어주는 데", "help"),
        v("아직 아무도 모르던 걸 알아내는 데", "dig"),
        v("사람들이 직접 쓰는 물건이나 서비스로", "make"),
        v("내 이름이나 작품으로 남는 데", "self"),
        v("팀이 함께 만든 결과로", "team"),
        v("믿고 맡길 수 있는 일상의 일로", "stable"),
      ]),
      q("matter", "일을 할 때 더 중요한 건?", [
        v("깊이 있게 이해하는 것", "dig"),
        v("빠르게 만들어서 보여주는 것", "make"),
        v("사람들에게 도움이 되는 것", "help"),
        v("내 색깔이 담기는 것", "self"),
        v("같이 만든다는 느낌", "team"),
        v("흔들리지 않고 예측되는 것", "stable"),
      ]),
      q("praise", "어떤 칭찬이 제일 기뻐?", [
        v("\"덕분에 힘이 됐어\"", "help"),
        v("\"진짜 깊이 알고 있네\"", "dig"),
        v("\"이걸 직접 만들었어?\"", "make"),
        v("\"너만의 느낌이 있어\"", "self"),
        v("\"같이 하니까 좋았어\"", "team"),
        v("\"믿고 맡길 수 있어\"", "stable"),
      ]),
      q("annoy", "답답하게 느껴지는 상황은?", [
        v("깊이 못 파고들고 넘어갈 때", "dig"),
        v("만들어 놓고 내놓지 못할 때", "make"),
        v("남을 도울 수 없을 때", "help"),
        v("내 방식이 받아들여지지 않을 때", "self"),
        v("혼자 다 해야 할 때", "team"),
        v("계획 없이 흘러갈 때", "stable"),
      ]),
      q("role", "동아리나 팀에서 자연스럽게 맡게 되는 역할은?", [
        v("자료를 파고드는 역할", "dig"),
        v("아이디어를 실제 결과물로 만드는 역할", "make"),
        v("사람들을 챙기는 역할", "help"),
        v("결과물을 꾸미고 표현하는 역할", "self"),
        v("의견을 모으고 조율하는 역할", "team"),
        v("일정과 순서를 챙기는 역할", "stable"),
      ]),
    ],
  },
  {
    id: "next",
    title: "앞으로 해보고 싶은 것",
    questions: [
      q("month2", "앞으로 한 달 동안 해본다면 어떤 형태가 좋아?", [
        v("작은 결과물 하나 만들어 보기", "make"),
        v("한 주제를 깊이 파보기", "dig"),
        v("누군가를 도와보는 경험", "help"),
        v("내 이야기를 글·영상으로 내보기", "self"),
        v("사람들과 함께 하는 프로젝트", "team"),
        v("매주 같은 시간에 조금씩 하기", "stable"),
      ]),
      q("vacation", "방학이 생기면 하고 싶은 건?", [
        v("혼자 오래 몰입할 일", "dig"),
        v("뭔가를 완성해서 올릴 일", "make"),
        v("봉사나 도움 활동", "help"),
        v("나를 드러낼 수 있는 창작", "self"),
        v("사람들과 함께하는 캠프나 모임", "team"),
        v("규칙적으로 지킬 수 있는 루틴", "stable"),
      ]),
      q("after", "무언가를 다 끝내고 나면 하고 싶은 건?", [
        v("공개해서 사람들이 쓰게 하기", "make"),
        v("기록으로 정리해 두기", "stable"),
        v("더 깊이 파고들 주제 찾기", "dig"),
        v("함께한 사람들과 돌아보기", "team"),
        v("써 본 사람의 반응 들어보기", "help"),
        v("내 이야기로 풀어서 쓰기", "self"),
      ]),
      q("model", "닮고 싶은 사람은 어떤 모습이야?", [
        v("한 분야를 끝까지 깊이 아는 사람", "dig"),
        v("뭐든 만들어서 세상에 내놓는 사람", "make"),
        v("주변 사람을 든든히 도와주는 사람", "help"),
        v("자기만의 색이 확실한 사람", "self"),
        v("사람들을 모아 일을 해내는 사람", "team"),
        v("믿고 맡길 수 있는 꾸준한 사람", "stable"),
      ]),
      q("hear", "내가 한 일을 남이 들으면 가장 좋아할 부분은?", [
        v("어떻게 만들었는지 과정", "make"),
        v("무엇을 알게 됐는지", "dig"),
        v("누구에게 도움이 됐는지", "help"),
        v("내가 어떤 사람인지 드러나는 부분", "self"),
        v("누구랑 어떻게 했는지", "team"),
      ]),
      q("new", "처음 해보는 일 앞에서 나는?", [
        v("해보면서 배울 수 있어서 설레", "make"),
        v("먼저 충분히 알아보고 싶어", "dig"),
        v("같이 할 사람이 있으면 편해", "team"),
        v("순서가 정해져 있으면 안심돼", "stable"),
        v("내 방식대로 해볼 수 있으면 좋아", "self"),
      ]),
    ],
  },
];

export const ALL_QUESTIONS: Question[] = SECTIONS.flatMap((s) => s.questions);

export type Picks = Record<string, string[]>;

/** 고른 선택지의 태그를 센다. 같은 태그가 여러 질문에서 나올수록 앞에 온다. 학생에게 점수로 보이지 않는다. */
export function tally(picks: Picks, top = 3): { fields: string[]; values: string[] } {
  const fields = new Map<string, number>();
  const values = new Map<string, number>();
  for (const question of ALL_QUESTIONS) {
    for (const o of question.options) {
      if (!(picks[question.id] ?? []).includes(o.label)) continue;
      o.fields?.forEach((x) => fields.set(x, (fields.get(x) ?? 0) + 1));
      o.values?.forEach((x) => values.set(x, (values.get(x) ?? 0) + 1));
    }
  }
  const best = (m: Map<string, number>, order: string[]) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
      .slice(0, top)
      .map(([k]) => k);
  return { fields: best(fields, FIELD_OPTIONS), values: best(values, VALUE_OPTIONS) };
}

export function answeredCount(picks: Picks): number {
  return ALL_QUESTIONS.filter((x) => (picks[x.id] ?? []).length > 0).length;
}

/** 요청으로 들어온 선택에서 선택지 안의 것만 남긴다. */
export function cleanHints(raw: unknown): { fields: string[]; values: string[] } {
  const r = (raw ?? {}) as { fields?: unknown; values?: unknown };
  const keep = (xs: unknown, allowed: string[]) =>
    Array.isArray(xs)
      ? [...new Set(xs.filter((x): x is string => typeof x === "string" && allowed.includes(x)))]
      : [];
  return { fields: keep(r.fields, FIELD_OPTIONS), values: keep(r.values, VALUE_OPTIONS) };
}
