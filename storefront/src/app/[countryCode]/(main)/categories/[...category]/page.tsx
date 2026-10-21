import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getCategoryByHandle } from "@lib/data/categories"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const handle = params.category?.[0] || "Category"
  return {
    title: `${handle} | AcademyIO`,
    description: `Explore webinars and professional courses in ${handle} on AcademyIO.`,
    alternates: {
      canonical: `${params.category.join("/")}`,
    },
  }
}

export default async function CategoryPage(props: Props) {
  const params = await props.params
  const handle = params.category?.[0]
  if (handle) {
    redirect(`/${params.countryCode}/courses-by-topics/${handle}`)
  }

  const searchParams = await props.searchParams
  const { sortBy, page } = searchParams

  try {
    const productCategory = await getCategoryByHandle(params.category)

    if (!productCategory) {
      notFound()
    }

    return (
      <CategoryTemplate
        category={productCategory}
        sortBy={sortBy}
        page={page}
        countryCode={params.countryCode}
      />
    )
  } catch (error) {
    notFound()
  }
}
