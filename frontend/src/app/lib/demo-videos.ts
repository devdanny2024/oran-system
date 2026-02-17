export type DemoVideo = {
  id: string;
  src: string;
  title: string;
  cost: string;
  location: string;
  sortOrder?: number;
  isActive?: boolean;
};

export const defaultDemoVideos: DemoVideo[] = [
  {
    id: 'eko-smart-home',
    src: '/video/eko.mp4',
    title: 'Eko Smart Home',
    cost: 'N5,600,000',
    location: 'Eko Atlantic, Lagos',
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'periwinkle-smart-home',
    src: '/video/periwinkle.mp4',
    title: 'Periwinkle Smart Home',
    cost: 'N5,600,000',
    location: 'Eko Atlantic, Lagos',
    sortOrder: 1,
    isActive: true,
  },
];
