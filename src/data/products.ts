import { DigitalProduct } from '../types';

export const CATALOG_PRODUCTS: DigitalProduct[] = [
  {
    id: 'prod_cloud_arch_pdf',
    title: 'Mastering Cloud Architecture & Event Streams',
    description: 'A 280-page definitive architectural handbook detailing distributed systems, idempotency patterns, and resilient event pipelines in high-throughput cloud environments.',
    category: 'ebook',
    price: 49.00,
    assetType: 'pdf',
    assetFileName: 'mastering-cloud-architecture-v2.pdf',
    fileSizeBytes: 14680064, // 14 MB
    badge: 'Bestseller eBook',
    coverGradient: 'from-blue-600 to-indigo-800',
    iconName: 'BookOpen',
  },
  {
    id: 'prod_cyberpunk_3d_pack',
    title: 'Cyberpunk Neo-Tokyo 3D Asset & Vector Pack',
    description: 'Over 120 high-fidelity 3D OBJ/FBX assets, 4K PBR textures, and ultra-high-resolution futuristic UI vector blueprints ready for Unreal Engine, Unity, and Figma.',
    category: 'asset_pack',
    price: 69.00,
    assetType: 'image',
    assetFileName: 'cyberpunk-neo-asset-pack-hd.png',
    fileSizeBytes: 48234496, // 46 MB
    badge: '3D Pro Kit',
    coverGradient: 'from-fuchsia-600 to-rose-700',
    iconName: 'Image',
  },
  {
    id: 'prod_microservices_starter',
    title: 'Enterprise Microservices & OAuth Starter Kit',
    description: 'Production-ready TypeScript Node.js, Docker compose setup, and Redis pub/sub templates with built-in JWT rotation, telemetry, and automated unit tests.',
    category: 'software',
    price: 89.00,
    assetType: 'zip',
    assetFileName: 'microservices-oauth-starter-bundle.zip',
    fileSizeBytes: 8912896, // 8.5 MB
    badge: 'Dev Toolkit',
    coverGradient: 'from-emerald-600 to-teal-800',
    iconName: 'Code',
  },
  {
    id: 'prod_ambient_sound_stems',
    title: 'Atmospheric Synthesizer Stems & Soundscapes',
    description: '24-bit 96kHz lossless WAV stems and MIDI compositions handcrafted on analog modular synths, mixed and mastered for multimedia creators and cinematic film scoring.',
    category: 'audio',
    price: 34.00,
    assetType: 'zip',
    assetFileName: 'analog-ambient-soundscapes-stems.zip',
    fileSizeBytes: 134217728, // 128 MB
    badge: 'Lossless Audio',
    coverGradient: 'from-amber-600 to-orange-800',
    iconName: 'Music',
  },
  {
    id: 'prod_fintech_figma_system',
    title: 'Fintech & SaaS Executive Design System 2026',
    description: 'Comprehensive design system token library with 800+ auto-layout components, WCAG AAA compliant palettes, dark/light modes, and interactive data visualization charts.',
    category: 'template',
    price: 59.00,
    assetType: 'zip',
    assetFileName: 'fintech-executive-design-system-v4.zip',
    fileSizeBytes: 22020096, // 21 MB
    badge: 'Figma & Code',
    coverGradient: 'from-cyan-600 to-blue-800',
    iconName: 'Layout',
  }
];
