import { Metadata } from "next"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ category?: string[]; countryCode: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const handle =
    (Array.isArray(params?.category) ? params.category[0] : null) || "Courses"
  const canonical = Array.isArray(params?.category)
    ? params.category.join("/")
    : ""

  return {
    title: `${handle} | AcademyIO`,
    description: `Explore webinars and professional courses in ${handle} on AcademyIO.`,
    alternates: {
      canonical,
    },
  }
}

export default async function CategoryPage(props: Props) {
  const params = await props.params
  const handle = Array.isArray(params?.category) ? params.category[0] : null
  if (handle) {
    redirect(`/${params.countryCode}/courses-by-topics/${handle}`)
  }

  redirect(`/${params.countryCode}/courses-by-topics`)
}
