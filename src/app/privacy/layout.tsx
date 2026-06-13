import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Mantoog',
  description:
    'How Mantoog collects, uses, and protects merchant data and TikTok advertising information, including lead-form personal data.',
  alternates: {
    canonical: 'https://mantoog.com/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | Mantoog',
    url: 'https://mantoog.com/privacy',
    siteName: 'Mantoog',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
