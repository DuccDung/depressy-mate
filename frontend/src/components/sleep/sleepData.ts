/**
 * Sleep Sounds & Tips Data
 * All sound URLs are free ambient/nature sounds hosted publicly.
 * Images are from Unsplash for beautiful sleep-themed visuals.
 */

export interface SleepTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;       // Display string e.g. "30 phút"
  durationMs: number;     // Duration in ms for progress bar
  category: 'ambient' | 'nature' | 'guided' | 'music';
  categoryLabel: string;
  image: string;
  audioUrl: string;
  bgColor: string;        // Tint color for the card
}

export const SLEEP_TRACKS: SleepTrack[] = [
  {
    id: 'rain',
    title: 'Mưa Nhẹ Đêm',
    artist: 'Thiên Nhiên',
    duration: '30 phút',
    durationMs: 30 * 60 * 1000,
    category: 'nature',
    categoryLabel: 'THIÊN NHIÊN',
    image: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/10/30/audio_607df6a0f7.mp3',
    bgColor: 'rgba(167, 243, 208, 0.25)',
  },
  {
    id: 'ocean',
    title: 'Sóng Biển Dịu Dàng',
    artist: 'Đại Dương',
    duration: '45 phút',
    durationMs: 45 * 60 * 1000,
    category: 'nature',
    categoryLabel: 'THIÊN NHIÊN',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/08/31/audio_419263af94.mp3',
    bgColor: 'rgba(191, 219, 254, 0.3)',
  },
  {
    id: 'piano',
    title: 'Piano Ru Ngủ',
    artist: 'Acoustic Dreams',
    duration: '20 phút',
    durationMs: 20 * 60 * 1000,
    category: 'music',
    categoryLabel: 'ÂM NHẠC',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/audio/2023/09/25/audio_0ebc3e1dfe.mp3',
    bgColor: 'rgba(221, 214, 254, 0.3)',
  },
  {
    id: 'forest',
    title: 'Rừng Đêm Tĩnh Lặng',
    artist: 'Thiên Nhiên',
    duration: '60 phút',
    durationMs: 60 * 60 * 1000,
    category: 'ambient',
    categoryLabel: 'AMBIENT',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/03/15/audio_4abfc1b6db.mp3',
    bgColor: 'rgba(167, 243, 208, 0.2)',
  },
  {
    id: 'meditation',
    title: 'Thiền Trước Giấc Ngủ',
    artist: 'Sanctuary Guide',
    duration: '15 phút',
    durationMs: 15 * 60 * 1000,
    category: 'guided',
    categoryLabel: 'HƯỚNG DẪN',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/audio/2023/07/07/audio_e3f3b8e3a2.mp3',
    bgColor: 'rgba(255, 243, 224, 0.4)',
  },
  {
    id: 'lofi',
    title: 'Lo-fi Chill Night',
    artist: 'Midnight Vibes',
    duration: '40 phút',
    durationMs: 40 * 60 * 1000,
    category: 'music',
    categoryLabel: 'ÂM NHẠC',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    audioUrl: 'https://cdn.pixabay.com/audio/2024/11/04/audio_af11f8e154.mp3',
    bgColor: 'rgba(221, 214, 254, 0.25)',
  },
];

export const SLEEP_TIPS: string[] = [
  '"Giữ nhiệt độ phòng ở 18°C để có giấc ngủ sâu và phục hồi tốt nhất."',
  '"Tránh sử dụng điện thoại ít nhất 30 phút trước khi đi ngủ để não bộ được thư giãn."',
  '"Uống trà hoa cúc hoặc sữa ấm trước khi ngủ giúp cơ thể thả lỏng tự nhiên."',
  '"Tập hít thở sâu 4-7-8: hít vào 4 giây, giữ 7 giây, thở ra 8 giây."',
  '"Đi ngủ và thức dậy cùng một giờ mỗi ngày, kể cả cuối tuần, để điều hòa nhịp sinh học."',
  '"Viết nhật ký trước khi ngủ giúp giải phóng tâm trí khỏi lo âu và suy nghĩ."',
  '"Tập yoga nhẹ nhàng hoặc giãn cơ 10 phút trước giờ ngủ giúp giảm căng thẳng hiệu quả."',
  '"Tránh caffeine sau 2 giờ chiều để không ảnh hưởng đến giấc ngủ buổi tối."',
  '"Sử dụng rèm chắn sáng hoặc mặt nạ ngủ để tạo bóng tối hoàn toàn cho phòng ngủ."',
  '"Nghe nhạc nhẹ hoặc tiếng thiên nhiên giúp giảm cortisol và đưa bạn vào giấc ngủ nhanh hơn."',
];

/**
 * Returns a deterministic tip based on the current date,
 * rotating through tips every 24 hours.
 */
export function getTodayTip(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return SLEEP_TIPS[dayOfYear % SLEEP_TIPS.length];
}
