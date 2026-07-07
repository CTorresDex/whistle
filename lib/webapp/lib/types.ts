export interface Audio {
  id: number;
  title: string;
  url: string;
  // local /thumbnail url of the stored webp, or null when none was captured
  thumbnail: string | null;
}

// type#youtube-search — a video result from the /explore search
export interface Video {
  title: string;
  url: string;
  duration: string;
  thumbnail: string | null;
}
