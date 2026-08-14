import { Redirect, useLocalSearchParams } from "expo-router";

export default function NewsDeepLinkRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();

  const newsId = Array.isArray(id) ? id[0] : id;

  if (!newsId) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Redirect
      href={{
        pathname: "/(tabs)",
        params: {
          newsId,
          newsSource: "share",
        },
      }}
    />
  );
}
