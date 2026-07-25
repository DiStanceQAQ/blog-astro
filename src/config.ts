export const SITE = {
  name: '刘家宁',
  title: '关于刘家宁的一切',
  description: '记录关于前端、可视化与创造力的长期思考。',
  url: 'https://example.com',
  locale: 'zh-CN',
  author: '刘家宁',
  email: '1428040080@qq.com',
  github: 'https://github.com/DiStanceQAQ',
  bilibili: 'https://space.bilibili.com/20729611',
} as const;

export const NAV = [
  { label: '首页', href: '/' },
  { label: '博客', href: '/blogs' },
  { label: '分类', href: '/categories' },
  { label: '关于', href: '/about' },
] as const;
