const ACTIVITIES = ['breathing', 'journal', 'affirmation', 'chat', 'none'];

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  kn: 'Kannada',
  ta: 'Tamil',
  es: 'Spanish',
};

/**
 * Builds the system prompt for Solace, the wellness companion.
 * Includes personal context so replies feel continuous and personal.
 */
export function buildSystemPrompt({ user, mood, recentMoods = [], isNewConversation, language = 'en' }) {
  const moodLine = mood
    ? `Their most recent mood check-in was "${mood}".`
    : 'They have not checked in a mood yet.';

  const historyLine = recentMoods.length
    ? `Recent mood check-ins (newest first): ${recentMoods.join(', ')}.`
    : 'No mood history available yet.';

  const replyLanguage = LANGUAGE_NAMES[language] || 'English';

  return `You are Solace, a warm, emotionally intelligent wellness companion inside a mobile app. You feel like a caring best friend: gentle, curious, never clinical, never preachy.

PERSONALITY
- Speak warmly and naturally, like a close friend who is a good listener.
- Keep replies concise (2-5 sentences).
- Never use emojis. Warmth comes from your words, not symbols.
- Validate feelings first, then gently offer one small, concrete next step.
- Ask at most one thoughtful follow-up question.
- Never repeat generic motivational slogans. Ground your reply in what the user actually said.
- Remember and reference earlier details from the conversation when relevant.

READ THE MOMENT
- If the user simply greets you ("hi", "hello", "hey", "good morning"), greet them back lightly by name and invite them in. Do not treat a greeting as emotional disclosure.
- If the user says thanks, acknowledge it simply and stay warm.
- If the user is making small talk, match their lightness. Do not force depth.
- Do not attach an affirmation to greetings, thanks, or small talk. Save affirmations for moments when the user shares something real.

CONTEXT
- The user's name is ${user?.name || 'friend'}.
- ${moodLine}
- ${historyLine}
- Today is ${new Date().toDateString()}.
- The user chose ${replyLanguage} as their language. Write the "reply", "title", and "affirmation" values in ${replyLanguage}, naturally and warmly, unless the user clearly writes in a different language. Keep the JSON keys themselves in English.

SUGGESTED ACTIVITIES
When it genuinely helps, suggest exactly one activity from this list:
- "breathing": grounding or box-breathing exercise
- "journal": a short reflective journaling prompt
- "affirmation": a personalized affirmation
- "chat": just keep talking
- "none": no activity needed
Only suggest an activity when it fits the moment. Do not force it.

SAFETY
- You are not a therapist and must never diagnose or give medical advice.
- If the user mentions self-harm, suicide, abuse, or an emergency, respond with compassion, encourage them to contact local emergency services or a crisis line immediately, and keep the reply short and supportive.

OUTPUT FORMAT
Return ONLY valid JSON with this exact shape:
{
  "reply": "your response to the user",
  "suggestedActivity": "one of: ${ACTIVITIES.join(', ')}",
  ${isNewConversation ? '"title": "a short 3-6 word title for this conversation",' : ''}
  "affirmation": "a short personalized affirmation for an emotional moment, otherwise an empty string"
}
Do not wrap the JSON in markdown.`;
}

/** Convert stored messages into Groq chat completion messages. */
export function toGroqMessages(systemPrompt, storedMessages) {
  return [
    { role: 'system', content: systemPrompt },
    ...storedMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];
}

/** Last-resort reply so the demo never breaks if the AI call fails. */
export function fallbackReply(userText, context = {}) {
  const text = (userText || '').trim().toLowerCase();
  const rawName = (context?.name || '').trim();
  const name = rawName || 'friend';
  const hello = name === 'friend' ? 'Hi, friend.' : `Hi, ${name}.`;
  const anxious = /anxious|anxiety/.test(context?.mood || '');

  if (/(suicide|kill myself|end my life|self.?harm|hurt myself|abuse)/.test(text)) {
    return {
      reply:
        "I'm really glad you told me. Please reach out to someone nearby or a local crisis line right now — you deserve support in this moment, and you should not carry this alone. I'm staying right here with you.",
      suggestedActivity: 'none',
      affirmation: '',
      title: 'You are not alone',
    };
  }

  if (
    /^(hi|hey|hello|hiya|yo|good (morning|afternoon|evening)|how are you|how are things|how's it going|what's up)[\s!.,?]*$/.test(
      text
    )
  ) {
    return {
      reply: anxious
        ? `${hello} I saw you checked in feeling anxious earlier. There is no rush here — we can take this one breath at a time.`
        : `${hello} It is good to see you. There is no agenda here — how has today been sitting with you?`,
      suggestedActivity: 'none',
      affirmation: '',
      title: 'A quiet hello',
    };
  }

  if (/^(thanks|thank you|thankyou|ty|appreciate it)[\s!.,?]*$/.test(text)) {
    return {
      reply: "You don't have to thank me. I'm just glad you're here.",
      suggestedActivity: 'none',
      affirmation: '',
      title: 'A quiet hello',
    };
  }

  if (/^(bye|goodbye|good night|goodnight|see you|talk later)[\s!.,?]*$/.test(text)) {
    return {
      reply: 'Rest well, friend. I will be right here when you come back.',
      suggestedActivity: 'none',
      affirmation: '',
      title: 'Until next time',
    };
  }

  if (/(breath|panic|anxious|anxiety|stress|overwhelm)/.test(text)) {
    return {
      reply:
        "That sounds heavy, and I'm glad you told me. Let's slow your body down for a moment together — would you like to try a short breathing exercise with me?",
      suggestedActivity: 'breathing',
      affirmation: 'You are safe in this moment, and this feeling will pass.',
      title: 'Finding calm together',
    };
  }
  if (/(lonely|alone|sad|empty|miss)/.test(text)) {
    return {
      reply:
        "I hear you, and I want you to know that feeling alone doesn't mean you are unloved. I'm right here with you. What has today felt like for you?",
      suggestedActivity: 'none',
      affirmation: 'You are worthy of connection and gentleness.',
      title: 'A gentle check-in',
    };
  }
  if (/(happy|good|great|excited|proud|grateful)/.test(text)) {
    return {
      reply:
        "I love hearing that. Let's let this moment sink in — what part of it felt the best?",
      suggestedActivity: 'journal',
      affirmation: 'I am allowed to savor the good moments.',
      title: 'Savouring a good day',
    };
  }
  if (text.length <= 3) {
    return {
      reply: "I'm here. Take your time — there's no right thing to say.",
      suggestedActivity: 'none',
      affirmation: '',
      title: 'A gentle conversation',
    };
  }
  return {
    reply:
      "I'm here, and I'm listening. What has been on your mind today?",
    suggestedActivity: 'none',
    affirmation: '',
    title: 'A gentle conversation',
  };
}

/**
 * Removes emoji from anything the model writes. The app's visual language is
 * deliberately calm, so even a model that ignores the prompt cannot add them.
 */
export function stripEmoji(text = '') {
  return String(text)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
