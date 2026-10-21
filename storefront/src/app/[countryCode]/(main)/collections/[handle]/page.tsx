import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import { StoreCollection } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<{
    page?: string
    sortBy?: SortOptions
  }>
}

export const PRODUCT_LIMIT = 12

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const collection = await getCollectionByHandle(params.handle)

    if (!collection) {
      return {
        title: `${params.handle} | AcademyIO`,
        description: `${params.handle} collection on AcademyIO`,
      }
    }

    return {
      title: `${collection.title} | AcademyIO`,
      description: `${collection.title} collection`,
    }
  } catch (error) {
    return {
      title: `${params.handle} | AcademyIO`,
      description: `${params.handle} collection on AcademyIO`,
    }
  }
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  let collection: StoreCollection | null = null
  try {
    collection = await getCollectionByHandle(params.handle)
  } catch (error) {
    notFound()
  }

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={params.countryCode}
    />
  )
}
