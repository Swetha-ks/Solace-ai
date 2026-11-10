import fs from 'node:fs';

function patch(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  for (const [from, to, all] of replacements) {
    const count = code.split(from).length - 1;
    if (!count) {
      console.log(`${file} MISS: ${from}`);
      continue;
    }
    code = all ? code.split(from).join(to) : code.replace(from, to);
    console.log(`${file} ${count}x ${from}`);
  }
  fs.writeFileSync(file, code);
}

patch('src/screens/ChatScreen.js', [
  ["import { getLanguage } from '../lib/i18n';", "import { getLanguage, useLanguage } from '../lib/i18n';"],
  [
    'export default function ChatScreen({ onBack, onOpenBreathing, initialDraft, onDraftConsumed }) {',
    'export default function ChatScreen({ onBack, onOpenBreathing, initialDraft, onDraftConsumed }) {\n  const { tr } = useLanguage();',
  ],
  ['<LocalizedText style={styles.promptChipText}>{item}</LocalizedText>', '<LocalizedText style={styles.promptChipText}>{tr(item)}</LocalizedText>'],
]);

patch('src/screens/ProfileScreen.js', [
  [
    "import { authApi, insightsApi, conversationsApi } from '../lib/api';",
    "import { authApi, insightsApi, conversationsApi } from '../lib/api';\nimport { useLanguage } from '../lib/i18n';",
  ],
  [
    'export default function ProfileScreen({ onSignOut, onOpenChat, onOpenBreathing, onOpenHome }) {',
    'export default function ProfileScreen({ onSignOut, onOpenChat, onOpenBreathing, onOpenHome }) {\n  const { tr } = useLanguage();',
  ],
  ['{day.isToday ? \'Today\' : meta ? meta.label : \'\'}', '{day.isToday ? tr(\'Today\') : meta ? tr(meta.label) : \'\'}'],
  ['<LocalizedText style={styles.moodLabel}>{meta.label}</LocalizedText>', '<LocalizedText style={styles.moodLabel}>{tr(meta.label)}</LocalizedText>'],
  [
    'accessibilityLabel={`Change the ${row.label.toLowerCase()} reminder time`}',
    'accessibilityLabel={`Change the ${tr(row.label).toLowerCase()} reminder time`}',
  ],
  ['<LocalizedText style={styles.timeChipLabel}>{row.label}</LocalizedText>', '<LocalizedText style={styles.timeChipLabel}>{tr(row.label)}</LocalizedText>'],
]);

patch('src/screens/OnboardingScreen.js', [
  ["import AppIcon from '../components/AppIcon';", "import AppIcon from '../components/AppIcon';\nimport { useLanguage } from '../lib/i18n';"],
  [
    'export default function OnboardingScreen({ onComplete, onSkip }) {',
    'export default function OnboardingScreen({ onComplete, onSkip }) {\n  const { tr } = useLanguage();',
  ],
  ['{item.eyebrow}', '{tr(item.eyebrow)}'],
  ['{item.titleTop}', '{tr(item.titleTop)}'],
  ['{item.titleAccent}', '{tr(item.titleAccent)}'],
  ['{item.text}', '{tr(item.text)}'],
]);
