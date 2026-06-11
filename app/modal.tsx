import { Redirect } from 'expo-router';

// News details page is intentionally disabled. All news content, media preview,
// save and share actions are handled directly inside the news card.
export default function DisabledNewsDetailsRoute() {
  return <Redirect href="/(tabs)" />;
}
