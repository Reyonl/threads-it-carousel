export interface ITNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  points?: number;
  comments?: number;
}

export interface CarouselSlide {
  index: number;
  type: "cover" | "point" | "closing";
  title: string;
  content: string;
  highlight?: string;
  sourceName?: string;
  footer?: string;
}

export interface CarouselConfig {
  slides: number;
  design: "light-clean";
  theme: {
    primary: string;
    text: string;
    background: string;
    secondary?: string;
  };
}
