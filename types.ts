export enum Role {
  USER = "user",
  MODEL = "model",
}

export enum AiMode {
  STANDARD_CHAT = "Стандартный чат",
  FAST_CHAT = "Быстрый чат",
  GALYA_GPT_PRO_THINKING = "Профессиональное мышление",
  SEARCH_GROUNDED = "Поиск с источниками",
  IMAGE_GEN = "Генерация изображений",
  IMAGE_EDIT = "Редактирование изображений",
  IMAGE_UNDERSTANDING = "Анализ изображений",
  VIDEO_UNDERSTANDING = "Анализ видео",
  TTS = "Синтез речи",
  LIVE_AUDIO = "Живой диалог",
  DERANGED_QUEEN_CHAT = "Дерзкая Королева",
}

export interface MessagePart {
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  isLoading?: boolean;
  sources?: { uri: string; title: string }[];
  loadingText?: string;
}

export interface Message {
  id: string;
  role: Role;
  parts: MessagePart[];
}

export interface User {
  name: string;
  initial: string;
}

export interface ChatSession {
  id:string;
  title: string;
  messages: Message[];
  mode: AiMode;
}