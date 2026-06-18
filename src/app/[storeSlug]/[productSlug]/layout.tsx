import type { Metadata } from 'next'
import {
  buildProductMetadata,
  fetchProductForStore,
  fetchStoreBySlug,
} from '@/lib/store/metadata'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ storeSlug: string; productSlug: string }>
}

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { storeSlug, productSlug } = await params
  const store = await fetchStoreBySlug(storeSlug)
  if (!store) {
    return { title: 'Store not found' }
  }

  const product = await fetchProductForStore(store.id, productSlug)
  if (!product) {
    return { title: `Product — ${store.name || store.slug}` }
  }

  return buildProductMetadata(store, product)
}

export default function ProductLayout({ children }: LayoutProps) {
  return children
}
