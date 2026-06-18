import type { Metadata } from 'next'
import { buildStoreMetadata, fetchStoreBySlug } from '@/lib/store/metadata'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ storeSlug: string }>
}

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { storeSlug } = await params
  const store = await fetchStoreBySlug(storeSlug)
  if (!store) {
    return { title: 'Store not found' }
  }
  return buildStoreMetadata(store)
}

export default function StoreLayout({ children }: LayoutProps) {
  return children
}
