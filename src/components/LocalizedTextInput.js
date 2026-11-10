import React from 'react';
import { TextInput } from 'react-native';
import { useLanguage } from '../lib/i18n';

/**
 * A TextInput that localizes its placeholder and accessibility labels.
 */
export default function LocalizedTextInput({
  placeholder,
  accessibilityLabel,
  accessibilityHint,
  translate = true,
  ...rest
}) {
  const { tr } = useLanguage();
  const on = (value) => (translate && typeof value === 'string' ? tr(value) : value);

  return (
    <TextInput
      {...rest}
      placeholder={on(placeholder)}
      accessibilityLabel={on(accessibilityLabel)}
      accessibilityHint={on(accessibilityHint)}
    />
  );
}
