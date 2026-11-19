require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SHOP_INFO = {
  name: '곰돌이 하수구',
  area: '',
  phone: '',
  prices: {
    sink: '',
    toilet: '',
    drain: '',
  }
};

const SYSTEM_PROMPT = `
너는 '${SHOP_INFO.name}'의 공식 AI 상담원이다.
곰돌이처럼 푸근하고 밝은 에너지로 고객의 답답한 마음을 풀어주며, 깔끔하고 정중한 표준어를 사용한다.

[핵심 응대 규칙]
1. 정직하고 투명한 안내: 작업 전 배관 내시경으로 원인을 먼저 확인하고, 고객 동의 없는 추가 요금은 절대 청구하지 않는다는 점을 강조한다.
2. 단가 안내 원칙: 가격을 물어보면 배관 막힘 원인과 작업 방식에 따라 달라져 정확한 금액을 미리 말씀드리기 어렵지만, 현장 확인 후 동의하실 때만 작업을 진행한다고 안내한다.
3. 모바일 가독성: 카카오톡 화면에서 읽기 편하도록 답변은 3~4문장 이내로 핵심만 간결하게 작성한다.
4. 자가 수리 주의 안내: 락스, 뜨거운 물, 뚫어뻥 과다 사용을 문의할 경우 배관 손상 및 역류 위험을 알리고 전문가 점검을 권유한다.
5. 행동 유도: 답변 끝에는 항상 [출동 예약 접수]를 진행하거나 [현장 사진/영상]을 채팅창에 올려달라고 안내한다. 또한 카카오톡 채널 예약 고객에게는 현장 작업비 10% 즉시 할인 혜택이 있음을 자연스럽게 알린다.
`;

function buildKakaoResponse(text, quickReplies = []) {
  const response = {
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: text,
          },
        },
      ],
    },
  };

  if (quickReplies.length > 0) {
    response.template.quickReplies = quickReplies;
  }

  return response;
}

const DEFAULT_QUICK_REPLIES = [
  { label: '싱크대 견적', action: 'message', messageText: '싱크대 막힘 견적 문의' },
  { label: '변기 견적', action: 'message', messageText: '변기 막힘 견적 문의' },
  { label: '하수구/고압세척', action: 'message', messageText: '하수구 고압세척 견적 문의' },
  { label: '🚚 출동 예약 접수', action: 'message', messageText: '출동 예약 접수' },
];

app.get('/', (req, res) => {
  res.send('🐻 곰돌이 하수구 카카오 챗봇 스킬 서버 가동 중 (무료 Gemini 버전)');
});

app.post('/kakao/webhook', async (req, res) => {
  try {
    const userUtterance = req.body?.userRequest?.utterance?.trim() || '';

    if (userUtterance === '싱크대 막힘 견적 문의') {
      const msg = `싱크대가 막혀서 많이 답답하셨죠? 곰돌이 하수구가 속 시원하게 해결해 드리겠습니다.\n\n현재 증상이나 배수구 사진을 채팅창에 남겨주시면 알맞은 작업 방식을 안내해 드립니다.\n\n작업 전 내시경으로 원인을 먼저 보여드리고, 동의하신 금액 외에 추가 요금은 절대 받지 않습니다. (채널 예약 시 작업비 10% 즉시 할인!)`;
      return res.json(buildKakaoResponse(msg, DEFAULT_QUICK_REPLIES));
    }

    if (userUtterance === '변기 막힘 견적 문의') {
      const msg = `변기 막힘은 무엇보다 빠른 해결이 중요합니다. 곰돌이 하수구가 즉시 출동할 준비가 되어 있습니다.\n\n현재 증상을 채팅창에 간단히 남겨주시면 빠르게 안내해 드리겠습니다.\n\n무리하게 뚫어뻥을 사용하시면 역류할 수 있으니 그대로 두시고 접수해 주세요. (채널 예약 시 작업비 10% 즉시 할인!)`;
      return res.json(buildKakaoResponse(msg, DEFAULT_QUICK_REPLIES));
    }

    if (userUtterance === '하수구 고압세척 견적 문의') {
      const msg = `배관 속 기름 슬러지나 이물질 막힘은 고압세척으로 확실하게 제거해야 재발하지 않습니다.\n\n막힌 위치와 증상을 남겨주시면 배관 상태에 맞는 정확한 해결 방법을 안내해 드립니다.\n\n배관 내시경으로 내부 상태부터 꼼꼼하게 확인해 드리겠습니다. (채널 예약 시 작업비 10% 즉시 할인!)`;
      return res.json(buildKakaoResponse(msg, DEFAULT_QUICK_REPLIES));
    }

    if (userUtterance === '출동 예약 접수') {
      const msg = `곰돌이 하수구 출동 예약 안내입니다. 🚚\n(채널 예약 고객 현장 작업비 10% 즉시 할인 적용)\n\n아래 양식을 복사해 채팅창에 남겨주시면 확인 즉시 연락드리겠습니다.\n\n[출동 접수 양식]\n1. 성함 / 연락처 :\n2. 방문 주소 :\n3. 막힌 곳 & 증상 :\n4. 희망 방문 시간 :`;
      return res.json(buildKakaoResponse(msg, DEFAULT_QUICK_REPLIES));
    }

   // 3개 모델에 동시에 요청을 쏴서 가장 먼저 대답하는 모델 채택 (직렬 대기 시간 0초)
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-2.5-flash-lite'
    ];

    const modelPromises = candidateModels.map(async (modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
      });
      const result = await model.generateContent(userUtterance);
      const text = result.response.text();
      if (!text) throw new Error('Empty response');
      return text;
    });

    // 전체 4.0초 안에 아무 모델이나 1개만 성공하면 즉시 응답, 전부 늦으면 안전 문구 반환
    const aiReply = await Promise.race([
      Promise.any(modelPromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Kakao 4.0s global guard')), 4000)
      )
    ]);

    return res.json(buildKakaoResponse(aiReply, DEFAULT_QUICK_REPLIES));

  } catch (error) {
    console.error('Webhook Error:', error);
    const fallbackMsg = `일시적인 상담 지연이 발생했습니다. 😅\n아래 버튼을 눌러 접수해 주시면 확인 즉시 빠르게 연락드리겠습니다.`;
    return res.json(buildKakaoResponse(fallbackMsg, DEFAULT_QUICK_REPLIES));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🐻 곰돌이 하수구 챗봇 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
