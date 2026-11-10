import React from 'react';
import { Text } from 'react-native';
import { useLanguage } from '../lib/i18n';

/**
 * Keeps leading and trailing whitespace so inline fragments
 * (`Hello, {name}.`) do not lose their spacing.
 */
function translateFragment(value, tr) {
  if (!value || !value.trim()) return value;
  const leading = value.match(/^\s*/)[0];
  const trailing = value.match(/\s*$/)[0];
  return `${leading}${tr(value.trim())}${trailing}`;
}

/**
 * A drop-in Text replacement that localizes static UI copy automatically.
 * User-written content (chat messages, journal entries, names) is passed as an
 * expression and stays untouched. Pass translate={false} to opt out.
 */
export default function LocalizedText({ children, translate = true, ...rest }) {
  const { tr } = useLanguage();

  if (!translate) {
    return <Text {...rest}>{children}</Text>;
  }

  return (
    <Text {...rest}>
      {React.Children.map(children, (child) =>
        typeof child === 'string' ? translateFragment(child, tr) : child
      )}
    </Text>
  );
}
