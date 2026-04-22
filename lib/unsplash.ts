const ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;

export interface UnsplashPhoto {
  id: string;
  url: string;
  photographerName: string;
  photographerUrl: string;
}

export async function fetchSampleFacadePhoto(): Promise<UnsplashPhoto> {
  if (!ACCESS_KEY) throw new Error("EXPO_PUBLIC_UNSPLASH_ACCESS_KEY is not set");
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=building+facade+architecture+new+york&orientation=portrait&client_id=${ACCESS_KEY}`,
  );
  if (!res.ok) throw new Error(`Unsplash error: ${res.status}`);
  const data = await res.json();
  return {
    id: data.id as string,
    url: data.urls.regular as string,
    photographerName: data.user.name as string,
    photographerUrl: `${data.user.links.html as string}?utm_source=facadelens&utm_medium=referral`,
  };
}
