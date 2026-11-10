import React from 'react';
import {
  House,
  MessageCircle,
  Wind,
  UserRound,
  Flame,
  Leaf,
  Bell,
  Lock,
  Clock,
  Trash,
  Mic,
  Ear,
  PenLine,
  Plus,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Heart,
  Feather,
  Flower2,
  Sparkles,
  Sprout,
  Pause,
  Play,
  X,
  Settings,
  Circle,
  Check,
  Bird,
  Mail,
} from 'lucide-react-native';

/**
 * A single, quiet visual language for the whole app.
 *
 * Thin line icons replace every emoji, so the interface feels calm and
 * consistent instead of noisy. Colours are passed in per screen.
 */
const ICONS = {
  home: House,
  chat: MessageCircle,
  wind: Wind,
  user: UserRound,
  streak: Flame,
  leaf: Leaf,
  bell: Bell,
  lock: Lock,
  clock: Clock,
  trash: Trash,
  mic: Mic,
  ear: Ear,
  pen: PenLine,
  plus: Plus,
  arrowUp: ArrowUp,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  chevronRight: ChevronRight,
  logout: LogOut,
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  rain: CloudRain,
  heart: Heart,
  feather: Feather,
  flower: Flower2,
  sparkles: Sparkles,
  sprout: Sprout,
  pause: Pause,
  play: Play,
  close: X,
  settings: Settings,
  circle: Circle,
  check: Check,
  bird: Bird,
  mail: Mail,
};

export default function AppIcon({
  name,
  size = 20,
  color = '#7C3AED',
  strokeWidth = 1.75,
  fill = 'none',
  style,
}) {
  const IconComponent = ICONS[name] || Circle;
  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={fill}
      style={style}
    />
  );
}
