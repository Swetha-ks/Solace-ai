import fs from 'node:fs';

const files = [
  ['src/components/Mascot.js', '../components'],
  ['src/components/VoiceListeningModal.js', '../components'],
  ['src/screens/BreathingScreen.js', '../components'],
  ['src/screens/WelcomeScreen.js', '../components'],
  ['src/screens/OnboardingScreen.js', '../components'],
  ['src/screens/AuthScreen.js', '../components'],
  ['src/screens/ChatScreen.js', '../components'],
  ['src/screens/ProfileScreen.js', '../components'],
  ['src/screens/HomeScreen.js', '../components'],
  ['App.js', './src/components'],
];

for (const [file, componentDir] of files) {
  let code = fs.readFileSync(file, 'utf8');
  const importMatch = code.match(/import\s*\{([^}]*)\}\s*from\s*'react-native';/);
  if (!importMatch) {
    console.log(`skip (no react-native import): ${file}`);
    continue;
  }

  const names = importMatch[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const hasText = names.includes('Text');
  const hasInput = names.includes('TextInput');
  const kept = names.filter((name) => name !== 'Text' && name !== 'TextInput');

  let rebuilt = `import {\n${kept.map((name) => `  ${name},`).join('\n')}\n} from 'react-native';`;
  if (hasText || hasInput) {
    const extra = [];
    if (hasText) extra.push(`import LocalizedText from '${componentDir}/LocalizedText';`);
    if (hasInput) extra.push(`import LocalizedTextInput from '${componentDir}/LocalizedTextInput';`);
    rebuilt += `\n${extra.join('\n')}`;
  }
  code = code.replace(importMatch[0], rebuilt);

  if (hasInput) {
    code = code.replace(/<TextInput(?![A-Za-z])/g, '<LocalizedTextInput');
    code = code.replace(/<\/TextInput>/g, '</LocalizedTextInput>');
  }
  if (hasText) {
    code = code.replace(/<Text(?![A-Za-z])/g, '<LocalizedText');
    code = code.replace(/<\/Text>/g, '</LocalizedText>');
  }

  fs.writeFileSync(file, code);
  console.log(`${file}: text=${hasText} input=${hasInput}`);
}
