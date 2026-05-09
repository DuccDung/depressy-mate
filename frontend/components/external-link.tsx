import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Linking, Platform, Text, type TextProps } from 'react-native';

type Props = TextProps & { href: string };

export function ExternalLink({ href, onPress, ...rest }: Props) {
  return (
    <Text
      accessibilityRole="link"
      {...rest}
      onPress={async (event) => {
        onPress?.(event);

        if (Platform.OS === 'web') {
          await Linking.openURL(href);
        } else {
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
