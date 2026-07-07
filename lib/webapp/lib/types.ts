export interface Audio {
  id: number;
  title: string;
  url: string;
}

// type#youtube-search — a video result from the /explore search
export interface Video {
  title: string;
  url: string;
  duration: string;
  thumbnail: string | null;
}
