import fs from 'node:fs';

const file = 'src/screens/HomeScreen.js';
let code = fs.readFileSync(file, 'utf8');
const before = code;

const swaps = [
  ['const { t } = useLanguage();', 'const { t, tr } = useLanguage();'],
  ['accessibilityLabel={m.label}', 'accessibilityLabel={tr(m.label)}'],
  ['{m.label}', '{tr(m.label)}'],
  ['{activeMood.title}', '{tr(activeMood.title)}'],
  ['{activeMood.body}', '{tr(activeMood.body)}'],
  ['{activeMood.actionLabel}', '{tr(activeMood.actionLabel)}'],
  ['{activeMood.secondaryLabel}', '{tr(activeMood.secondaryLabel)}'],
  ['accessibilityLabel={activeMood.actionLabel}', 'accessibilityLabel={tr(activeMood.actionLabel)}'],
  ['accessibilityLabel={activeMood.secondaryLabel}', 'accessibilityLabel={tr(activeMood.secondaryLabel)}'],
  ['{tinyAction}', '{tr(tinyAction)}'],
  ['accessibilityLabel={habit.title}', 'accessibilityLabel={tr(habit.title)}'],
  ['{habit.title}', '{tr(habit.title)}'],
  ['{habit.sub}', '{tr(habit.sub)}'],
  ['`Remove ${habit.title}`', '`Remove ${tr(habit.title)}`'],
  ['`Add ${suggestion}`', '`Add ${tr(suggestion)}`'],
  ['{suggestion}', '{tr(suggestion)}'],
  ['accessibilityLabel={step.title}', 'accessibilityLabel={tr(step.title)}'],
  ['{step.title}', '{tr(step.title)}'],
  ['{step.sub}', '{tr(step.sub)}'],
  ['{GROUNDING_STEPS[groundStep].sense}', '{tr(GROUNDING_STEPS[groundStep].sense)}'],
  ['{GROUNDING_STEPS[groundStep].hint}', '{tr(GROUNDING_STEPS[groundStep].hint)}'],
];

for (const [from, to] of swaps) {
  const count = code.split(from).length - 1;
  if (!count) {
    console.log(`MISS: ${from}`);
    continue;
  }
  code = code.split(from).join(to);
  console.log(`${count}x ${from}`);
}

if (code === before) console.log('no change');
fs.writeFileSync(file, code);
